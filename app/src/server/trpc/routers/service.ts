import { publicProcedure, router } from '../trpc';
import { createDraft, getDraftById, getDraftByUrl } from '@/server/db/dbOperations';
import { modifyResourceToDraft } from '@/util/modifyResourceFields';
import { FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';
import { getChildren } from '@/util/serviceUtils';
import { Bundle, BundleEntry, FhirResource, OperationOutcome } from 'fhir/r4';

/**
 * Endpoints dealing with outgoing calls to the central measure repository service
 */
export const serviceRouter = router({
  getPublicUrl: publicProcedure.query(async () => {
    return process.env.PUBLIC_MRS_SERVER;
  }),

  getArtifactCounts: publicProcedure.query(async () => {
    const [measureBundle, libraryBundle] = await Promise.all([
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count`)
    ]).then(([resMeasure, resLibrary]) =>
      Promise.all([resMeasure.json() as Promise<fhir4.Bundle>, resLibrary.json() as Promise<fhir4.Bundle>])
    );

    return {
      Measure: measureBundle.total ?? 0,
      Library: libraryBundle.total ?? 0
    } as const;
  }),

  getArtifactsByType: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']) }))
    .query(async ({ input }) => {
      const artifactBundle = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}`).then(
        resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>
      );
      const artifactList = artifactBundle.entry?.map(entry => ({
        label:
          entry.resource?.name?.concat(`|${entry.resource.version}`) ||
          entry.resource?.id?.concat(`|${entry.resource.version}`) ||
          '',
        value: entry.resource?.id || `${entry.resource?.resourceType}` || '',
        disabled: !!entry.resource?.extension?.find(
          ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean === true
        )
      }));

      return artifactList;
    }),

  getDataRequirements: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .query(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$data-requirements`);
      const resource = await res.json();
      if (resource?.resourceType === 'OperationOutcome') {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: resource?.issue[0]?.details?.text
        });
      }
      return resource as fhir4.Library;
    }),

  getArtifactById: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .query(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = await res.json();
      return resource as FhirArtifact;
    }),

  draftParent: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .mutation(async ({ input }) => {
      // fetch the artifact from the measure repository using its resource type and id
      const draftRes = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const draftJson = (await draftRes.json()) as FhirArtifact;

      // recursively get any child artifacts from the artifact if they exist
      const children = draftJson.relatedArtifact ? await getChildren(draftJson.relatedArtifact) : [];

      const draftArtifact = modifyResourceToDraft({ ...draftJson });

      // create a draft of the modified parent artifact
      const res = await createDraft(input.resourceType, draftArtifact);

      return { draftId: draftArtifact.id, children, ...res };
    }),

  draftChild: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), url: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      // search the measure repository for an artifact of the same resource type, url, and version
      // assume that artifacts will have unique urls and versions, so return the first entry in the bundle
      const artifactBundle = await fetch(
        `${process.env.MRS_SERVER}/${input.resourceType}?` +
          new URLSearchParams({ url: input.url, version: input.version })
      ).then(resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>);

      if (!artifactBundle.entry || artifactBundle.entry.length === 0) {
        throw new Error('No artifacts found in search');
      }
      const draftRes = artifactBundle.entry?.[0].resource;

      // increment the version in the url and update the relatedArtifact.resource to have the new version on the url
      const draftChildArtifact = modifyResourceToDraft(draftRes as FhirArtifact);

      // create a draft of the modified child artifact
      const res = await createDraft(input.resourceType, draftChildArtifact);

      return {
        draftId: draftChildArtifact.id,
        id: draftRes?.id,
        resourceType: draftChildArtifact.resourceType,
        ...res
      };
    }),

  // new release procedures (batched release of parent and child using transaction bundle)
  releaseParent: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      // get the parent draft artifact by id
      const draftRes = await getDraftById(input.id, input.resourceType);

      // if a draft artifact of that resource type and id exists, then modify its content to be an active artifact
      if (draftRes) {
        draftRes.version = input.version;
        draftRes.status = 'active';
        draftRes.date = DateTime.now().toISO() || '';
      } else {
        throw new Error(`No draft artifact found for resourceType ${input.resourceType}, id ${input.id}`);
      }

      // construct transaction bundle
      const txnBundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: draftRes as FhirResource,
            request: {
              method: 'POST',
              url: `${draftRes?.resourceType}/${draftRes?.id}`
            }
          }
        ]
      };

      // recursively get any child artifacts from the artifact if they exist
      const children = draftRes?.relatedArtifact ? await getChildren(draftRes.relatedArtifact) : [];
      const toDelete: {
        resourceType: 'Measure' | 'Library';
        id: string;
      }[] = [{ resourceType: input.resourceType, id: input.id }]; //start with parent and add children to be deleted upon success
      const childEntries = children.map(async c => {
        // get the draft child artifact by its URL and version
        const childDraftRes = await getDraftByUrl(c.url, c.version, c.resourceType);

        // if a draft artifact of that resource type, url, and version exists, then modify its content to be an active artifact
        if (childDraftRes) {
          childDraftRes.version = c.version;
          childDraftRes.status = 'active';
          childDraftRes.date = DateTime.now().toISO() || '';
          toDelete.push({ resourceType: c.resourceType, id: childDraftRes.id });
        } else {
          throw new Error(
            `No child draft artifact found for resourceType ${c.resourceType}, version ${c.version}, and URL ${c.url}`
          );
        }
        return {
          resource: childDraftRes,
          request: {
            method: 'POST',
            url: `${childDraftRes.resourceType}/${childDraftRes.id}`
          }
        } as BundleEntry<FhirResource>;
      });

      txnBundle.entry?.push(...(await Promise.all(childEntries)));

      // release the parent draft artifact to the measure repository through a PUT operation to the server by id
      const res = await fetch(`${process.env.MRS_SERVER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(txnBundle)
      });

      if (res.status === 500) {
        // If error, return error text
        const outcome: OperationOutcome = await res.json();
        return { location: null, deletable: null, status: res.status, error: outcome.issue[0].details?.text };
      }

      const resBundle: Bundle = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No transaction responses found for releasing ${input.resourceType}, id ${input.id}`);
      }
      let location = resBundle.entry[0].response?.location; //response same order as request
      if (location?.substring(0, 5) === '4_0_1') {
        location = location?.substring(5); // remove 4_0_1 (version)
      }

      return { location: location, deletable: toDelete, status: res.status, error: null };
    })
});

import { publicProcedure, router } from '../trpc';
import { createDraft, getDraftById, getDraftByUrl } from '@/server/db/dbOperations';
import { modifyResourceToDraft } from '@/util/modifyResourceFields';
import { ArtifactResourceType, FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';

export interface ReleaseArtifactInfo extends ArtifactInfo {
  res: Response;
  location: string | null;
}

export type ArtifactInfo = {
  resourceType: 'Measure' | 'Library';
  id: string;
};

function getChildFromRelatedArtifact(relatedArtifact: fhir4.RelatedArtifact) {
  if (
    relatedArtifact.type === 'composed-of' &&
    relatedArtifact.resource &&
    relatedArtifact.extension?.some(
      e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
    )
  ) {
    let resourceType: ArtifactResourceType;
    if (relatedArtifact.resource?.includes('Measure')) {
      resourceType = 'Measure';
    } else {
      resourceType = 'Library';
    }

    const [url, version] = relatedArtifact.resource.split('|');

    return { resourceType, url, version };
  }
}

async function draftChildren(relatedArtifacts: fhir4.RelatedArtifact[]) {
  let result: ArtifactInfo[] = [];

  for (const ra of relatedArtifacts) {
    const relatedArtifact = getChildFromRelatedArtifact(ra);

    if (relatedArtifact) {
      // fetch the artifact by URL and version
      const artifactBundle = await fetch(
        `${process.env.NEXT_PUBLIC_MRS_SERVER}/${relatedArtifact.resourceType}?` +
          new URLSearchParams({ url: relatedArtifact.url, version: relatedArtifact.version })
      ).then(resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>);

      const draftRes = artifactBundle.entry?.[0].resource;

      // increment the version in the url and update the relatedArtifact.resource to have the new version on the url
      const draftArtifact = modifyResourceToDraft(draftRes as FhirArtifact);

      // create a draft of the modified relatedArtifact
      await createDraft(relatedArtifact.resourceType, draftArtifact);

      result.push({ resourceType: relatedArtifact.resourceType, id: draftArtifact.id });

      if (draftArtifact.relatedArtifact) {
        const nested = await draftChildren(draftArtifact.relatedArtifact);
        result = result.concat(nested);
      }
    }
  }
  return result;
}

async function releaseChildren(relatedArtifacts: fhir4.RelatedArtifact[]) {
  let result: ReleaseArtifactInfo[] = [];

  for (const ra of relatedArtifacts) {
    const relatedArtifact = getChildFromRelatedArtifact(ra);

    if (relatedArtifact) {
      // get the draft by its URL and version, assume unique url on draft resources
      const draftRes = await getDraftByUrl(relatedArtifact.url, relatedArtifact.version, relatedArtifact.resourceType);

      // modify the draft to be active, etc.
      if (draftRes) {
        draftRes.version = relatedArtifact.version;
        draftRes.status = 'active';
        draftRes.date = DateTime.now().toISO() || '';

        // send to server
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_MRS_SERVER}/${relatedArtifact.resourceType}/${draftRes.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json+fhir'
            },
            body: JSON.stringify(draftRes)
          }
        );

        let location = res.headers.get('Location');
        if (location?.substring(0, 5) === '4_0_1') {
          location = location?.substring(5); // remove 4_0_1 (version)
        }

        // add response to array
        result.push({ resourceType: relatedArtifact.resourceType, id: draftRes.id, res: res, location: location });

        // call releaseChildren
        if (draftRes?.relatedArtifact) {
          const nested = await releaseChildren(draftRes.relatedArtifact);
          result = result.concat(nested);
        }
      }
    }
  }

  return result;
}

/**
 * Endpoints dealing with outgoing calls to the central measure repository service
 */
export const serviceRouter = router({
  getArtifactCounts: publicProcedure.query(async () => {
    const [measureBundle, libraryBundle] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/Measure`),
      fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/Library`)
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
      const artifactBundle = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}`).then(
        resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>
      );

      const artifactList = artifactBundle.entry?.map(entry => ({
        label: entry.resource?.name || entry.resource?.id || '',
        value: entry.resource?.id || `${entry.resource?.resourceType}` || ''
      }));

      return artifactList;
    }),

  getDataRequirements: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .query(async ({ input }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}/${input.id}/$data-requirements`
      );
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = await res.json();
      return resource as FhirArtifact;
    }),

  convertArtifactById: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .mutation(async ({ input }) => {
      const draftRes = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}/${input.id}`);
      const draftJson = (await draftRes.json()) as FhirArtifact;

      const children = draftJson.relatedArtifact ? await draftChildren(draftJson.relatedArtifact) : [];

      const draftArtifact = modifyResourceToDraft({ ...draftJson });
      const res = await createDraft(input.resourceType, draftArtifact);

      return { draftId: draftArtifact.id, children: children, ...res };
    }),

  releaseArtifactByUrl: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      const draftRes = await getDraftById(input.id, input.resourceType);
      if (draftRes) {
        draftRes.version = input.version;
        draftRes.status = 'active';
        draftRes.date = DateTime.now().toISO() || '';
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}/${draftRes?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(draftRes)
      });
      let location = res.headers.get('Location');
      if (location?.substring(0, 5) === '4_0_1') {
        location = location?.substring(5); // remove 4_0_1 (version)
      }

      const children = draftRes?.relatedArtifact ? await releaseChildren(draftRes.relatedArtifact) : [];

      return { location: location, status: res.status, children: children };
    })
});

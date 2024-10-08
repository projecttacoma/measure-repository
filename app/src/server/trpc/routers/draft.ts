import { CRMIShareableMeasure, FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { Bundle, OperationOutcome } from 'fhir/r4';
import { calculateVersion } from '@/util/versionUtils';

/**
 * Endpoints dealing with outgoing calls to the central measure repository service to handle draft artifacts
 */
export const draftRouter = router({
  getDraftCounts: publicProcedure.query(async () => {
    const [measureBundle, libraryBundle] = await Promise.all([
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count&status=draft`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count&status=draft`)
    ]).then(([resMeasure, resLibrary]) =>
      Promise.all([resMeasure.json() as Promise<Bundle>, resLibrary.json() as Promise<Bundle>])
    );

    return {
      Measure: measureBundle.total ?? 0,
      Library: libraryBundle.total ?? 0
    } as const;
  }),

  getDrafts: publicProcedure.input(z.enum(['Measure', 'Library']).optional()).query(async ({ input }) => {
    if (!input) return null;
    const artifactBundle = await fetch(`${process.env.MRS_SERVER}/${input}?status=draft`).then(
      resArtifacts => resArtifacts.json() as Promise<Bundle<FhirArtifact>>
    );
    const artifactList = artifactBundle.entry
      ?.filter(entry => entry.resource)
      .map(entry => entry.resource as FhirArtifact);
    return artifactList;
  }),

  getDraftById: publicProcedure
    .input(z.object({ id: z.string().optional(), resourceType: z.enum(['Measure', 'Library']).optional() }))
    .query(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = await res.json();
      return resource as FhirArtifact;
    }),

  createDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any() }))
    .mutation(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(input.draft)
      });
      if (res.status === 201) {
        // get resultant id from location header
        return { draftId: res.headers.get('Location')?.split('/')[2] as string };
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on create: ${outcome.issue[0].details?.text}`);
    }),

  updateDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), values: z.any(), id: z.string() }))
    .mutation(async ({ input }) => {
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource: FhirArtifact = await raw.json();
      resource.url = input.values.url;
      resource.identifier = [{ system: input.values.identifierSystem, value: input.values.identifierValue }];
      resource.name = input.values.name;
      resource.title = input.values.title;
      resource.description = input.values.description;
      if (input.resourceType === 'Measure') {
        (resource as CRMIShareableMeasure).library = input.values.library;
      }
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(resource)
      });
      if (res.status === 200) {
        return {};
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on update: ${outcome.issue[0].details?.text}`);
    }),

  deleteDraft: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        }
      });

      if (res.status === 204) {
        const resData = { draftId: input.id, resourceType: input.resourceType, children: [] as FhirArtifact[] };

        // TODO: update to use server-side batch delete to find child information once it returns a 200/bundle
        //   const resBundle: Bundle<FhirArtifact> = await res.json();
        //   if (!resBundle.entry || resBundle.entry.length === 0) {
        //     throw new Error(`No deletions found from deleting ${input.resourceType}, id ${input.id}`);
        //   }
        //   resBundle.entry.forEach(e => {
        //     if(e.resource?.extension?.find(ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean)){
        //       resData.children.push(e.resource);
        //     }
        //   });
        return resData;
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on delete: ${outcome.issue[0].details?.text}`);
    }),

  cloneParent: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = (await raw.json()) as FhirArtifact;
      const version = await calculateVersion(input.resourceType, resource.url, resource.version);
      // $clone with calculated version
      const res = await fetch(
        `${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$clone?version=${version}&url=${resource.url}`
      );

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on $clone: ${outcome.issue[0].details?.text}`);
      }

      const resBundle: Bundle<FhirArtifact> = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No clones found from cloning ${input.resourceType}, id ${input.id}`);
      }

      const resData = { cloneId: undefined as string | undefined, children: [] as FhirArtifact[] };
      resBundle.entry.forEach(e => {
        if (
          e.resource?.extension?.find(
            ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
          )
        ) {
          resData.children.push(e.resource);
        } else {
          resData.cloneId = e.resource?.id;
        }
      });
      return resData;
    }),

  // passes in type, summary, and author from user (set date and target automatically)
  reviewDraft: publicProcedure
    .input(
      z.object({
        id: z.string(),
        resourceType: z.enum(['Measure', 'Library']),
        type: z.string(),
        summary: z.string(),
        author: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = (await raw.json()) as FhirArtifact;
      const date = new Date().toISOString();
      const canonical = `${resource.url}|${resource.version}`;

      const params = new URLSearchParams({
        reviewDate: date,
        artifactAssessmentType: input.type,
        artifactAssessmentSummary: input.summary,
        artifactAssessmentTarget: canonical,
        artifactAssessmentAuthor: input.author
      });
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$review?${params}`);

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on $review:  ${outcome.issue[0].details?.text}`);
      }

      const resBundle: Bundle<FhirArtifact> = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No updated resources found from reviewing ${input.resourceType}, id ${input.id}`);
      }

      const resData = { reviewId: undefined as string | undefined, children: [] as FhirArtifact[] };
      resBundle.entry.forEach(e => {
        if (
          e.resource?.extension?.find(
            ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
          )
        ) {
          resData.children.push(e.resource);
        } else {
          resData.reviewId = e.resource?.id;
        }
      });
      return resData;
    })
});

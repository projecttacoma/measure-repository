import { CRMIShareableMeasure, FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { Bundle, OperationOutcome } from 'fhir/r4';

/**
 * Endpoints dealing with outgoing calls to the central measure repository service to handle draft measures
 */
export const draftRouter = router({
  getDraftCounts: publicProcedure.query(async () => {
    const [measureBundle, libraryBundle] = await Promise.all([
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count&status=draft`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count&status=draft`)
    ]).then(([resMeasure, resLibrary]) =>
      Promise.all([resMeasure.json() as Promise<fhir4.Bundle>, resLibrary.json() as Promise<fhir4.Bundle>])
    );

    return {
      Measure: measureBundle.total ?? 0,
      Library: libraryBundle.total ?? 0
    } as const;
  }),

  // getDrafts: publicProcedure
  //   .input(z.enum(['Measure', 'Library']).optional())
  //   .query(async opts => (opts.input ? getAllDraftsByType<FhirArtifact>(opts.input) : null)),

  // TODO: double check this lines up with above
  getDrafts: publicProcedure
    .input(z.enum(['Measure', 'Library']).optional())
    .query(async ({ input }) => {
      if (!input) return null;
      const artifactBundle = await fetch(
        `${process.env.MRS_SERVER}/${input}?status=draft`
      ).then(resArtifacts => resArtifacts.json() as Promise<fhir4.Bundle<FhirArtifact>>);
      const artifactList = artifactBundle.entry?.filter(entry => entry.resource).map(entry => entry.resource as FhirArtifact);
      return artifactList;
    }),

  // getDraftById: publicProcedure
  //   .input(z.object({ id: z.string().optional(), resourceType: z.enum(['Measure', 'Library']).optional() }))
  //   .query(async ({ input }) =>
  //     input.id && input.resourceType ? getDraftById<FhirArtifact>(input.id, input.resourceType) : null
  //   ),
  // TODO: double check this lines up with above
  getDraftById: publicProcedure
    .input(z.object({ id: z.string().optional(), resourceType: z.enum(['Measure', 'Library']).optional() }))
    .query(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = await res.json();
      return resource as FhirArtifact;
    }),

  // getDraftByUrl: publicProcedure
  //   .input(
  //     z.object({
  //       url: z.string().optional(),
  //       version: z.string().optional(),
  //       resourceType: z.enum(['Measure', 'Library']).optional()
  //     })
  //   )
  //   .query(async ({ input }) => {
  //     input.url && input.resourceType && input.version
  //       ? getDraftByUrl<FhirArtifact>(input.url, input.version, input.resourceType)
  //       : null;
  //   }),
  // TODO: double check this isn't needed
  // getDraftByUrl: publicProcedure
  //   .input(z.object({ resourceType: z.enum(['Measure', 'Library']), url: z.string(), version: z.string() }))
  //   .query(async ({ input }) => {
  //     const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}?url=${input.url}&version=${input.version}`);
  //     const bundle:Bundle<FhirArtifact> = await res.json();
  //     // return first entry found in bundle
  //     return bundle.entry && bundle.entry.length > 0 ? bundle.entry[0].resource : null;
  //   }),




    // TODO: fix below CRUD

  createDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any() }))
    .mutation(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(input.draft)
      });
      if(res.status === 201){
        // TODO: check behavior if server creates own id?
        return { draftId: input.draft.id as string };
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on create:  ${outcome.issue[0].details?.text}`);
    }),

  updateDraft: publicProcedure
    .input(
      z.object({ resourceType: z.enum(['Measure', 'Library']), values: z.any(), id: z.string() })
    )
    .mutation(async ({ input }) => {
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource: FhirArtifact = await raw.json();
      resource.url = input.values.url;
      resource.identifier = [{system: input.values.identifierSystem, value:input.values.identifierValue}];
      resource.name = input.values.name;
      resource.title = input.values.title;
      resource.description = input.values.description;
      if(input.resourceType === 'Measure'){
        (resource as CRMIShareableMeasure).library = input.values.library;
      }
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(resource)
      });
      if(res.status === 200){
        return {};
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on update:  ${outcome.issue[0].details?.text}`);
    }),

  deleteDraft: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        }
      });

      if(res.status === 200){
        const resBundle: Bundle<FhirArtifact> = await res.json();

        if (!resBundle.entry || resBundle.entry.length === 0) {
          throw new Error(`No deletions found from deleting ${input.resourceType}, id ${input.id}`);
        }

        const resData = { draftId: input.id, resourceType: input.resourceType, children: [] as FhirArtifact[] };
        resBundle.entry.forEach(e => {
          if(e.resource?.extension?.find(ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean)){
            resData.children.push(e.resource);
          }
        });
        // TODO: check functionality on return children list for notification from updated server's "remove" children implementation
        return resData;
      }
      const outcome: OperationOutcome = await res.json();
      throw new Error(`Received ${res.status} error on delete:  ${outcome.issue[0].details?.text}`);
    }),


  cloneParent: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {

      // TODO: use modifyResource logic to determine a reasonable version
      const version = 'placeholder';
      // $clone with calculated version
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$clone?version=${version}`);

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on $clone:  ${outcome.issue[0].details?.text}`);
      }

      const resBundle: Bundle<FhirArtifact> = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No clones found from cloning ${input.resourceType}, id ${input.id}`);
      }

      const resData = { cloneId: undefined as string|undefined, children: [] as FhirArtifact[] };
      resBundle.entry.forEach(e => {
        if(e.resource?.extension?.find(ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean)){
          resData.children.push(e.resource);
        }else{
          resData.cloneId = e.resource?.id;
        }
      });
      return resData;
    })
});

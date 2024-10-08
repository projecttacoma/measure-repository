import { publicProcedure, router } from '../trpc';
import { CRMIShareableLibrary, FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Bundle, OperationOutcome } from 'fhir/r4';
import { calculateVersion } from '@/util/versionUtils';

/**
 * Endpoints dealing with outgoing calls to the central measure repository service to handle active artifacts
 */
export const serviceRouter = router({
  getPublicUrl: publicProcedure.query(async () => {
    return process.env.PUBLIC_MRS_SERVER;
  }),

  getArtifactCounts: publicProcedure.query(async () => {
    const [measureBundle, libraryBundle] = await Promise.all([
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count&status=active`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count&status=active`)
    ]).then(([resMeasure, resLibrary]) =>
      Promise.all([resMeasure.json() as Promise<Bundle>, resLibrary.json() as Promise<Bundle>])
    );

    return {
      Measure: measureBundle.total ?? 0,
      Library: libraryBundle.total ?? 0
    } as const;
  }),

  getArtifactsByType: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']) }))
    .query(async ({ input }) => {
      const artifactBundle = await fetch(
        `${process.env.MRS_SERVER}/${input.resourceType}?_elements=id,name,extension,version&status=active`
      ).then(resArtifacts => resArtifacts.json() as Promise<Bundle<FhirArtifact>>);
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
      return resource as CRMIShareableLibrary;
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
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource = (await raw.json()) as FhirArtifact;
      const version = await calculateVersion(resource.resourceType, resource.url, resource.version);
      // $draft with calculated version
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$draft?version=${version}`);

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on $draft: ${outcome.issue[0].details?.text}`);
      }

      const resBundle: Bundle<FhirArtifact> = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No drafts found from drafting ${input.resourceType}, id ${input.id}`);
      }

      const resData = { draftId: undefined as string | undefined, children: [] as FhirArtifact[] };
      resBundle.entry.forEach(e => {
        if (
          e.resource?.extension?.find(
            ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
          )
        ) {
          resData.children.push(e.resource);
        } else {
          resData.draftId = e.resource?.id;
        }
      });
      return resData;
    }),

  releaseParent: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      const res = await fetch(
        `${process.env.MRS_SERVER}/${input.resourceType}/${input.id}/$release?releaseVersion=${input.version}&versionBehavior=force`
      );

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        return { location: null, deletable: null, status: res.status, error: outcome.issue[0].details?.text };
      }

      const resBundle: Bundle<FhirArtifact> = await res.json();

      if (!resBundle.entry || resBundle.entry.length === 0) {
        throw new Error(`No released artifacts found from releasing ${input.resourceType}, id ${input.id}`);
      }

      const released: {
        resourceType: 'Measure' | 'Library';
        id: string;
      }[] = [{ resourceType: input.resourceType, id: input.id }]; //start with parent and add children
      resBundle.entry.forEach(e => {
        if (
          e.resource?.extension?.find(
            ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
          )
        ) {
          released.push({ resourceType: e.resource.resourceType, id: e.resource.id });
        }
      });

      return { location: `/${input.resourceType}/${input.id}`, released: released, status: res.status, error: null };
    })
});

import { publicProcedure, router } from '../trpc';
import { CRMIShareableLibrary, FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Bundle, OperationOutcome } from 'fhir/r4';
import { calculateVersion } from '@/util/versionUtils';

/**
 * Endpoints dealing with outgoing calls to the central measure repository service to handle active (or retired) artifacts
 */
export const serviceRouter = router({
  getPublicUrl: publicProcedure.query(async () => {
    return process.env.PUBLIC_MRS_SERVER;
  }),

  getAuthoring: publicProcedure.query(async () => {
    // get authoring environment based on capability statement
    const res = await fetch(`${process.env.MRS_SERVER}/metadata`);
    const capabilityStatement = res.status === 200 ? ((await res.json()) as fhir4.CapabilityStatement) : null;
    //defaults to publishable if capability statement cannot be resolved
    return !!capabilityStatement?.instantiates?.includes(
      'http://hl7.org/fhir/us/cqfmeasures/CapabilityStatement/authoring-measure-repository'
    );
  }),

  getArtifactCounts: publicProcedure.query(async () => {
    // TODO: simplify this query when server can handle OR'd search params (i.e. /Measure?_summary=count&status=active,retired)
    const [measureBundleActive, measureBundleRetired, libraryBundleActive, libraryBundleRetired] = await Promise.all([
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count&status=active`),
      fetch(`${process.env.MRS_SERVER}/Measure?_summary=count&status=retired`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count&status=active`),
      fetch(`${process.env.MRS_SERVER}/Library?_summary=count&status=retired`)
    ]).then(([resMeasureActive, resMeasureRetired, resLibraryActive, resLibraryRetired]) =>
      Promise.all([
        resMeasureActive.json() as Promise<Bundle>,
        resMeasureRetired.json() as Promise<Bundle>,
        resLibraryActive.json() as Promise<Bundle>,
        resLibraryRetired.json() as Promise<Bundle>
      ])
    );

    return {
      Measure: (measureBundleActive.total ?? 0) + (measureBundleRetired.total ?? 0),
      Library: (libraryBundleActive.total ?? 0) + (libraryBundleRetired.total ?? 0)
    } as const;
  }),

  getArtifactsByType: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']) }))
    .query(async ({ input }) => {
      const [artifactBundleActive, artifactBundleRetired] = await Promise.all([
        fetch(`${process.env.MRS_SERVER}/${input.resourceType}?_elements=id,name,extension,version&status=active`),
        fetch(`${process.env.MRS_SERVER}/${input.resourceType}?_elements=id,name,extension,version&status=retired`)
      ]).then(([resArtifactsActive, resArtifactsRetired]) =>
        Promise.all([
          resArtifactsActive.json() as Promise<Bundle<FhirArtifact>>,
          resArtifactsRetired.json() as Promise<Bundle<FhirArtifact>>
        ])
      );
      const artifactList = (artifactBundleActive.entry || []).concat(artifactBundleRetired.entry || []).map(entry => ({
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
    }),

  publish: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), jsonInput: z.string() }))
    .mutation(async ({ input }) => {
      let artifact: FhirArtifact;
      try {
        artifact = JSON.parse(input.jsonInput);
      } catch (error) {
        throw new Error('Unable to parse json input.');
      }
      if (artifact.status !== 'active') {
        throw new Error('Input artifact must be in active status.');
      }

      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: input.jsonInput
      });

      if (raw.status !== 201) {
        const outcome: OperationOutcome = await raw.json();
        throw new Error(`Received ${raw.status} error on publish: ${outcome.issue[0].details?.text}`);
      }
      const id = raw.headers.get('Location')?.split('/')[2] as string;

      return { location: `/${input.resourceType}/${id}`, status: raw.status, error: null };
    }),

  retireParent: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .mutation(async ({ input }) => {
      const raw = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`);
      const resource: FhirArtifact = await raw.json();
      resource.status = 'retired';
      resource.date = new Date().toISOString();
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json+fhir',
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(resource)
      });

      if (res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on retire: ${outcome.issue[0].details?.text}`);
      }

      // TODO: Use this once we have a response from retire that includes the list of resources updated
      // const resBundle: Bundle<FhirArtifact> = await res.json();
      // if (!resBundle.entry || resBundle.entry.length === 0) {
      //   throw new Error(`No artifacts found found from retiring ${input.resourceType}, id ${input.id}`);
      // }

      // const retired: {
      //   resourceType: 'Measure' | 'Library';
      //   id: string;
      // }[] = [{ resourceType: input.resourceType, id: input.id }]; //start with parent and add children
      // resBundle.entry.forEach(e => {
      //   if (
      //     e.resource?.extension?.find(
      //       ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
      //     )
      //   ) {
      //     retired.push({ resourceType: e.resource.resourceType, id: e.resource.id });
      //   }
      // });

      const retired: {
        resourceType: 'Measure' | 'Library';
        id: string;
      }[] = [];

      return { location: `/${input.resourceType}/${input.id}`, retired: retired, status: res.status, error: null };
    }),

  archiveParent: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .mutation(async ({ input }) => {
      const res = await fetch(`${process.env.MRS_SERVER}/${input.resourceType}/${input.id}`, { method: 'DELETE' });

      if (res.status !== 204 && res.status !== 200) {
        const outcome: OperationOutcome = await res.json();
        throw new Error(`Received ${res.status} error on archive: ${outcome.issue[0].details?.text}`);
      }

      // TODO: Use this once we have a response from archive that includes the list of resources updated
      // const resBundle: Bundle<FhirArtifact> = await res.json();
      // if (!resBundle.entry || resBundle.entry.length === 0) {
      //   throw new Error(`No artifacts found found from archiving ${input.resourceType}, id ${input.id}`);
      // }

      // const archived: {
      //   resourceType: 'Measure' | 'Library';
      //   id: string;
      // }[] = [{ resourceType: input.resourceType, id: input.id }]; //start with parent and add children
      // resBundle.entry.forEach(e => {
      //   if (
      //     e.resource?.extension?.find(
      //       ext => ext.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && ext.valueBoolean
      //     )
      //   ) {
      //     archived.push({ resourceType: e.resource.resourceType, id: e.resource.id });
      //   }
      // });
      const archived: {
        resourceType: 'Measure' | 'Library';
        id: string;
      }[] = [];

      return { location: `/${input.resourceType}/${input.id}`, archived: archived, status: res.status, error: null };
    })
});

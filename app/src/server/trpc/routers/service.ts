import { publicProcedure, router } from '../trpc';
import { createDraft, getDraftById } from '@/server/db/dbOperations';
import { modifyResourceToDraft } from '@/util/modifyResourceFields';
import { FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { DateTime } from 'luxon';

export type ArtifactInfo = {
  resourceType: 'Measure' | 'Library';
  id: string;
  res: Response;
  location: string | null;
};

async function releaseChildren(
  resourceType: 'Measure' | 'Library',
  id: string,
  version: string,
  artifacts: ArtifactInfo[]
) {
  console.log('HELLO', id);
  const draftRes = await getDraftById(id, resourceType);
  if (draftRes) {
    draftRes.version = version;
    draftRes.status = 'active';
    draftRes.date = DateTime.now().toISO() || '';
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${resourceType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+fhir'
    },
    body: JSON.stringify(draftRes)
  });

  let location = res.headers.get('Location');
  if (location?.substring(0, 5) === '4_0_1') {
    location = location?.substring(5); // remove 4_0_1 (version)
  }

  artifacts.push({ resourceType: resourceType, id: id, res: res, location: location });

  console.log('draftRes', draftRes);

  draftRes?.relatedArtifact?.forEach(ra => {
    if (
      ra.type === 'composed-of' &&
      ra.resource &&
      ra.extension?.some(
        e => e.url === 'http://hl7.org/fhir/StructureDefinition/artifact-isOwned' && e.valueBoolean === true
      )
    ) {
      const url = ra.resource?.split('|')[0];
      const id = url.split('Library/')[1];
      console.log('hello', url, id);
      releaseChildren('Library', id, version, artifacts);
    }
  });
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
      const draftArtifact = modifyResourceToDraft((await draftRes.json()) as FhirArtifact);

      const res = await createDraft(input.resourceType, draftArtifact);
      return { draftId: draftArtifact.id, ...res };
    }),

  releaseArtifactById: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      const draftRes = await getDraftById(input.id, input.resourceType);
      if (draftRes) {
        draftRes.version = input.version;
        draftRes.status = 'active';
        draftRes.date = DateTime.now().toISO() || '';
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json+fhir'
        },
        body: JSON.stringify(draftRes)
      });
      let location = res.headers.get('Location');
      if (location?.substring(0, 5) === '4_0_1') {
        location = location?.substring(5); // remove 4_0_1 (version)
      }
      return { location: location, status: res.status };
    }),

  releaseChildren: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string(), version: z.string() }))
    .mutation(async ({ input }) => {
      const artifacts: ArtifactInfo[] = [];
      await releaseChildren(input.resourceType, input.id, input.version, artifacts);
      console.log('ARTIFACTS', artifacts);

      return artifacts;
    })
});

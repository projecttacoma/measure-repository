import { FhirArtifact } from '@/util/types/fhir';
import { publicProcedure, router } from '../trpc';
import { z } from 'zod';
import { draftRouter } from './draft';
import { v4 as uuidv4 } from 'uuid';

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

  convertArtifactById: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), id: z.string() }))
    .mutation(async ({ input }) => {
      const draftRes = await fetch(`${process.env.NEXT_PUBLIC_MRS_SERVER}/${input.resourceType}/${input.id}`);
      const draftArtifact = (await draftRes.json()) as FhirArtifact;
      draftArtifact.id = uuidv4();
      draftArtifact.status = 'draft';

      const draftCaller = draftRouter.createCaller({});
      const res = await draftCaller.createDraft({ resourceType: input.resourceType, draft: draftArtifact });
      return res;
    })
});

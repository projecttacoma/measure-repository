import { FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import { createDraft, getAllDraftsByType, getDraftById, getDraftCount, updateDraft } from '../../db/dbOperations';
import { publicProcedure, router } from '../trpc';

/** one big router with resource types passed in */
export const draftRouter = router({
  getDraftCounts: publicProcedure.query(async () => {
    const measureCount = await getDraftCount('Measure');
    const libraryCount = await getDraftCount('Library');

    return {
      Measure: measureCount,
      Library: libraryCount
    };
  }),

  getDrafts: publicProcedure
    .input(z.enum(['Measure', 'Library']))
    .query(async opts => getAllDraftsByType<FhirArtifact>(opts.input)),

  getDraftById: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .query(async ({ input }) => getDraftById<FhirArtifact>(input.id, input.resourceType)),

  createDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any() }))
    .mutation(async ({ input }) => {
      const res = await createDraft(input.resourceType, input.draft);
      return { draftId: input.draft.id as string, ...res };
    }),

  updateDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any(), id: z.string() }))
    .mutation(async ({ input }) => {
      return updateDraft(input.resourceType, input.id, input.draft);
    })
});
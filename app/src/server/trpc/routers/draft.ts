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
    .input(z.enum(['Measure', 'Library']).optional())
    .query(async opts => (opts.input ? getAllDraftsByType<FhirArtifact>(opts.input) : null)),

  getDraftById: publicProcedure
    .input(z.object({ id: z.string().optional(), resourceType: z.enum(['Measure', 'Library']).optional() }))
    .query(async ({ input }) =>
      input.id && input.resourceType ? getDraftById<FhirArtifact>(input.id, input.resourceType) : null
    ),

  createDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any() }))
    .mutation(async ({ input }) => {
      const res = await createDraft(input.resourceType, input.draft);
      return { draftId: input.draft.id as string, ...res };
    }),

  updateDraft: publicProcedure
    .input(
      z.object({ resourceType: z.enum(['Measure', 'Library']), additions: z.any(), deletions: z.any(), id: z.string() })
    )
    .mutation(async ({ input }) => {
      return updateDraft(input.resourceType, input.id, input.additions, input.deletions);
    })
});

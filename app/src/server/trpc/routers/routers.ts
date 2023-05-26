import { z } from 'zod';
import { createDraft, getAllDraftsByType, getDraftById, updateDraft } from '../../db/dbOperations';
import { publicProcedure, router } from '../trpc';

/** one big router with resource types passed in */
export const draftRouter = router({
  getDrafts: publicProcedure
    .input(z.enum(['Measure', 'Library']))
    .query(async opts => getAllDraftsByType<fhir4.Measure | fhir4.Library>(opts.input)),

  getDraftById: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .query(async opts => getDraftById<fhir4.Measure | fhir4.Library>(opts.input.id, opts.input.resourceType)),

  createDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any() }))
    .mutation(async opts => {
      const res = await createDraft(opts.input.resourceType, opts.input.draft);
      return { draftId: opts.input.draft.id as string, ...res };
    }),

  updateDraft: publicProcedure
    .input(z.object({ resourceType: z.enum(['Measure', 'Library']), draft: z.any(), id: z.string() }))
    .mutation(async ({ input }) => {
      return updateDraft(input.resourceType, input.id, input.draft);
    })
});

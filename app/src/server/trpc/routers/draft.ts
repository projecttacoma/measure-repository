import { FhirArtifact } from '@/util/types/fhir';
import { z } from 'zod';
import {
  createDraft,
  getAllDraftsByType,
  getDraftById,
  getDraftCount,
  updateDraft,
  deleteDraft,
  getDraftByUrl,
  batchDeleteDraft
} from '../../db/dbOperations';
import { publicProcedure, router } from '../trpc';
import { getDraftChildren } from '@/util/serviceUtils';

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

  getDraftByUrl: publicProcedure
    .input(
      z.object({
        url: z.string().optional(),
        version: z.string().optional(),
        resourceType: z.enum(['Measure', 'Library']).optional()
      })
    )
    .query(async ({ input }) => {
      input.url && input.resourceType && input.version
        ? getDraftByUrl<FhirArtifact>(input.url, input.version, input.resourceType)
        : null;
    }),

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
    }),

  deleteDraft: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {
      const res = await deleteDraft(input.resourceType, input.id);
      return { draftId: input.id, resourceType: input.resourceType, ...res };
    }),

  deleteParent: publicProcedure
    .input(z.object({ id: z.string(), resourceType: z.enum(['Measure', 'Library']) }))
    .mutation(async ({ input }) => {
      // get the parent draft artifact by id
      const draftRes = await getDraftById(input.id, input.resourceType);

      if (!draftRes) {
        throw new Error(`No draft artifact found for resourceType ${input.resourceType}, id ${input.id}`);
      }

      // recursively get any child artifacts from the artifact if they exist
      const children = draftRes?.relatedArtifact ? await getDraftChildren(draftRes.relatedArtifact) : [];

      const childDrafts = children.map(async child => {
        const draft = await getDraftByUrl(child.url, child.version, child.resourceType);
        if (!draft) {
          throw new Error('No artifacts found in search');
        }
        return draft;
      });

      const draftArtifacts = [draftRes].concat(await Promise.all(childDrafts));

      await batchDeleteDraft(draftArtifacts);

      return { draftId: draftRes.id, children: children };
    })
});

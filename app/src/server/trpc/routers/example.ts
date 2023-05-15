import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const exampleRouter = router({
  hello: publicProcedure
    .input(
      z.object({
        text: z.string()
      })
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input.text}`
      };
    })
});

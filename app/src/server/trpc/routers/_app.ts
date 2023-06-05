import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { draftRouter } from './draft';
import { router } from '../trpc';
import { serviceRouter } from './service';

export const appRouter = router({ draft: draftRouter, service: serviceRouter });

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { draftRouter } from './routers';

export const appRouter = draftRouter;

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

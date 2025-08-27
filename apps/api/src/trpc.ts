// tRPC Router Configuration - Type-safe API
// Configuración principal de tRPC con middlewares y router base

import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { restaurantRouter } from './routers/restaurant';
import { menuRouter } from './routers/menu';
import { orderRouter } from './routers/order';
import { authRouter } from './routers/auth';
import { reservationRouter } from './routers/reservation';

// Inicializar tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.code === 'BAD_REQUEST' && error.cause?.name === 'ZodError'
          ? (error.cause as any).flatten()
          : null,
      },
    };
  },
});

// Middleware de autenticación
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Usuario garantizado
    },
  });
});

// Middleware para roles específicos
const requireRole = (roles: string[]) => t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  
  if (!roles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Access denied. Required roles: ${roles.join(', ')}`,
    });
  }
  
  return next({ ctx });
});

// Procedures base
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(requireRole(['ADMIN']));
export const kitchenProcedure = t.procedure.use(requireRole(['ADMIN', 'KITCHEN']));
export const staffProcedure = t.procedure.use(requireRole(['ADMIN', 'KITCHEN', 'WAITER', 'CASHIER']));

// Router principal
export const appRouter = t.router({
  // Autenticación (público)
  auth: authRouter,
  
  // Configuración del restaurante
  restaurant: restaurantRouter,
  
  // Gestión del menú
  menu: menuRouter,
  
  // Sistema de pedidos
  order: orderRouter,
  
  // Sistema de reservas
  reservation: reservationRouter,
  
  // Health check público
  health: t.router({
    check: publicProcedure
      .query(() => {
        return {
          status: 'OK',
          timestamp: new Date().toISOString(),
          service: 'Ordo tRPC API',
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
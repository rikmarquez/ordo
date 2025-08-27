// Restaurant Router - Configuración del restaurante
// Maneja la configuración única del restaurante (branding, horarios, etc.)

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { Context } from '../context';

const t = initTRPC.context<Context>().create();

// Middlewares locales
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({ ctx });
});

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

// Procedures
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(isAuthed);
const adminProcedure = t.procedure.use(requireRole(['ADMIN']));

// Esquemas de validación
const restaurantConfigSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'Slug debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  contactInfo: z.object({
    phone: z.string(),
    email: z.string().email().optional(),
    whatsapp: z.string().optional(),
  }),
  address: z.object({
    street: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  openingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), is_closed: z.boolean() }),
  }),
  services: z.object({
    dine_in: z.boolean(),
    takeout: z.boolean(),
    delivery: z.boolean(),
    reservations: z.boolean(),
  }),
  deliveryConfig: z.object({
    fee: z.number(),
    minimum_order: z.number(),
    delivery_radius_km: z.number(),
    estimated_time_minutes: z.number(),
    is_free_over_amount: z.number().optional(),
  }).optional(),
  branding: z.object({
    primary_color: z.string(),
    secondary_color: z.string(),
    logo_url: z.string().optional(),
    favicon_url: z.string().optional(),
    cover_image_url: z.string().optional(),
    custom_domain: z.string().optional(),
  }),
});

const updateRestaurantSchema = restaurantConfigSchema.partial().omit({ slug: true });

export const restaurantRouter = t.router({
  // Obtener configuración del restaurante (público)
  getConfig: publicProcedure
    .query(async ({ ctx }) => {
      const config = await ctx.prisma.restaurantConfig.findFirst({
        where: { isActive: true },
      });
      
      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Configuración del restaurante no encontrada',
        });
      }
      
      return config;
    }),

  // Obtener configuración por slug (público - para multi-instancia futura)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const config = await ctx.prisma.restaurantConfig.findUnique({
        where: { slug: input.slug, isActive: true },
      });
      
      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }
      
      return config;
    }),

  // Verificar si el restaurante está abierto (público)
  isOpen: publicProcedure
    .query(async ({ ctx }) => {
      const config = await ctx.prisma.restaurantConfig.findFirst({
        where: { isActive: true },
        select: { openingHours: true, name: true },
      });
      
      if (!config) {
        return { isOpen: false, reason: 'Restaurant not configured' };
      }
      
      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()] as keyof typeof config.openingHours;
      const daySchedule = (config.openingHours as any)[currentDay];
      
      if (!daySchedule || daySchedule.is_closed) {
        return { 
          isOpen: false, 
          reason: 'Closed today',
          restaurantName: config.name,
          nextOpenDay: null // TODO: Calcular próximo día abierto
        };
      }
      
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const openTime = parseInt(daySchedule.open.split(':')[0]) * 60 + parseInt(daySchedule.open.split(':')[1]);
      const closeTime = parseInt(daySchedule.close.split(':')[0]) * 60 + parseInt(daySchedule.close.split(':')[1]);
      
      const isCurrentlyOpen = currentTime >= openTime && currentTime <= closeTime;
      
      return {
        isOpen: isCurrentlyOpen,
        reason: isCurrentlyOpen ? null : 'Outside operating hours',
        restaurantName: config.name,
        openingHours: daySchedule,
        currentTime: now.toTimeString().slice(0, 5),
      };
    }),

  // Crear configuración inicial (solo admins)
  create: adminProcedure
    .input(restaurantConfigSchema)
    .mutation(async ({ input, ctx }) => {
      // Verificar que no exista ya una configuración
      const existingConfig = await ctx.prisma.restaurantConfig.findFirst();
      
      if (existingConfig) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya existe una configuración del restaurante',
        });
      }
      
      const config = await ctx.prisma.restaurantConfig.create({
        data: input,
      });
      
      return config;
    }),

  // Actualizar configuración (solo admins)
  update: adminProcedure
    .input(updateRestaurantSchema)
    .mutation(async ({ input, ctx }) => {
      const existingConfig = await ctx.prisma.restaurantConfig.findFirst({
        where: { isActive: true },
      });
      
      if (!existingConfig) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Configuración del restaurante no encontrada',
        });
      }
      
      const updatedConfig = await ctx.prisma.restaurantConfig.update({
        where: { id: existingConfig.id },
        data: input,
      });
      
      return updatedConfig;
    }),

  // Obtener estadísticas básicas del restaurante (staff)
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [todayOrders, todayReservations, totalCustomers] = await Promise.all([
        ctx.prisma.order.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
            status: { not: 'CANCELLED' },
          },
        }),
        
        ctx.prisma.reservation.count({
          where: {
            reservationDate: {
              gte: today,
              lt: tomorrow,
            },
            status: { not: 'CANCELLED' },
          },
        }),
        
        ctx.prisma.customer.count(),
      ]);
      
      const todaySales = await ctx.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          paymentStatus: 'PAID',
        },
        _sum: {
          total: true,
        },
      });
      
      return {
        todayOrders,
        todayReservations,
        totalCustomers,
        todaySales: todaySales._sum.total || 0,
      };
    }),
});
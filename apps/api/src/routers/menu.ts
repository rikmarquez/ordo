// Menu Router - Gestión del menú del restaurante
// CRUD completo para categorías, items y modificadores

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
const staffProcedure = t.procedure.use(requireRole(['ADMIN', 'KITCHEN', 'WAITER', 'CASHIER']));

// Esquemas de validación
const createCategorySchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

const createMenuItemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser mayor a 0'),
  imageUrls: z.array(z.string().url()).optional(),
  preparationTimeMinutes: z.number().int().min(1).optional(),
  ingredients: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  dietaryInfo: z.object({
    vegetarian: z.boolean().optional(),
    vegan: z.boolean().optional(),
    gluten_free: z.boolean().optional(),
    spicy_level: z.number().int().min(0).max(5).optional(),
  }).optional(),
});

const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  id: z.string(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

const createModifierSchema = z.object({
  menuItemId: z.string(),
  name: z.string().min(1),
  priceAdjustment: z.number().optional(),
  isRequired: z.boolean().optional(),
  options: z.array(z.object({
    name: z.string(),
    price: z.number().optional(),
  })).optional(),
});

export const menuRouter = t.router({
  // === CATEGORÍAS ===
  
  // Listar todas las categorías (público)
  getCategories: publicProcedure
    .query(async ({ ctx }) => {
      const categories = await ctx.prisma.menuCategory.findMany({
        where: { isActive: true },
        include: {
          menuItems: {
            where: { isAvailable: true },
            select: { id: true, name: true, price: true, imageUrls: true },
            take: 3, // Solo 3 items como preview
          },
          _count: {
            select: { menuItems: { where: { isAvailable: true } } },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      });
      
      return categories;
    }),

  // Crear categoría (staff)
  createCategory: staffProcedure
    .input(createCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await ctx.prisma.menuCategory.create({
        data: input,
      });
      
      return category;
    }),

  // Actualizar categoría (staff)
  updateCategory: staffProcedure
    .input(updateCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      const category = await ctx.prisma.menuCategory.update({
        where: { id },
        data,
      });
      
      return category;
    }),

  // Eliminar categoría (staff)
  deleteCategory: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar que no tenga items activos
      const itemCount = await ctx.prisma.menuItem.count({
        where: { categoryId: input.id, isAvailable: true },
      });
      
      if (itemCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No se puede eliminar una categoría que tiene items activos',
        });
      }
      
      await ctx.prisma.menuCategory.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      
      return { success: true };
    }),

  // === ITEMS DEL MENÚ ===

  // Obtener menú completo (público)
  getFullMenu: publicProcedure
    .query(async ({ ctx }) => {
      const categories = await ctx.prisma.menuCategory.findMany({
        where: { isActive: true },
        include: {
          menuItems: {
            where: { isAvailable: true },
            include: {
              modifiers: true,
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      });
      
      return categories;
    }),

  // Obtener items de una categoría (público)
  getItemsByCategory: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ input, ctx }) => {
      const items = await ctx.prisma.menuItem.findMany({
        where: {
          categoryId: input.categoryId,
          isAvailable: true,
        },
        include: {
          modifiers: true,
          category: { select: { name: true } },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { name: 'asc' },
        ],
      });
      
      return items;
    }),

  // Obtener item por ID (público)
  getItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const item = await ctx.prisma.menuItem.findUnique({
        where: { id: input.id },
        include: {
          modifiers: true,
          category: { select: { name: true } },
        },
      });
      
      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item no encontrado',
        });
      }
      
      return item;
    }),

  // Obtener items destacados (público)
  getFeaturedItems: publicProcedure
    .query(async ({ ctx }) => {
      const items = await ctx.prisma.menuItem.findMany({
        where: {
          isFeatured: true,
          isAvailable: true,
        },
        include: {
          category: { select: { name: true } },
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
      });
      
      return items;
    }),

  // Crear item (staff)
  createItem: staffProcedure
    .input(createMenuItemSchema)
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.menuItem.create({
        data: input,
        include: {
          category: { select: { name: true } },
          modifiers: true,
        },
      });
      
      return item;
    }),

  // Actualizar item (staff)
  updateItem: staffProcedure
    .input(updateMenuItemSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      const item = await ctx.prisma.menuItem.update({
        where: { id },
        data,
        include: {
          category: { select: { name: true } },
          modifiers: true,
        },
      });
      
      return item;
    }),

  // Cambiar disponibilidad rápida (staff)
  toggleAvailability: staffProcedure
    .input(z.object({ 
      id: z.string(),
      isAvailable: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const item = await ctx.prisma.menuItem.update({
        where: { id: input.id },
        data: { isAvailable: input.isAvailable },
        select: { id: true, name: true, isAvailable: true },
      });
      
      return item;
    }),

  // === MODIFICADORES ===

  // Crear modificador (staff)
  createModifier: staffProcedure
    .input(createModifierSchema)
    .mutation(async ({ input, ctx }) => {
      const modifier = await ctx.prisma.itemModifier.create({
        data: input,
      });
      
      return modifier;
    }),

  // Actualizar modificador (staff)
  updateModifier: staffProcedure
    .input(createModifierSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      const modifier = await ctx.prisma.itemModifier.update({
        where: { id },
        data,
      });
      
      return modifier;
    }),

  // Eliminar modificador (staff)
  deleteModifier: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.itemModifier.delete({
        where: { id: input.id },
      });
      
      return { success: true };
    }),

  // === BÚSQUEDA ===

  // Buscar items (público)
  searchItems: publicProcedure
    .input(z.object({ 
      query: z.string().min(2),
      categoryId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const items = await ctx.prisma.menuItem.findMany({
        where: {
          isAvailable: true,
          categoryId: input.categoryId || undefined,
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
            { ingredients: { has: input.query } },
          ],
        },
        include: {
          category: { select: { name: true } },
          modifiers: true,
        },
        take: 20,
        orderBy: [
          { isFeatured: 'desc' },
          { name: 'asc' },
        ],
      });
      
      return items;
    }),
});
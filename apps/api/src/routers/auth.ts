// Auth Router - Autenticación y gestión de usuarios staff
// Maneja login, registro y gestión de tokens

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
  role: z.string().default('CUSTOMER'),
});

const createStaffSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  role: z.enum(['ADMIN', 'KITCHEN', 'WAITER', 'CASHIER']),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
});

const updateStaffSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'KITCHEN', 'WAITER', 'CASHIER']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const authRouter = t.router({
  // Login unificado (clientes y staff)
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      
      // Buscar usuario en tabla unificada
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });
      
      if (!user || !user.isActive) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }
      
      // Verificar password hasheado
      if (!user.password) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Usuario sin contraseña configurada',
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }
      
      // Crear JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.NEXTAUTH_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // Registro de usuarios (clientes)
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { password, ...userData } = input;
      
      // Verificar que el email no exista
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: userData.email },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya existe un usuario con ese email',
        });
      }
      
      // Hash del password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Crear usuario
      const newUser = await ctx.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
        },
      });
      
      // Crear JWT token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role },
        process.env.NEXTAUTH_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user: newUser,
      };
    }),

  // Obtener perfil del usuario autenticado
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }
      
      return user;
    }),

  // Crear nuevo miembro del staff (solo admins)
  createStaff: adminProcedure
    .input(createStaffSchema)
    .mutation(async ({ input, ctx }) => {
      const { password, ...userData } = input;
      
      // Verificar que el email no exista
      const existingUser = await ctx.prisma.staffUser.findUnique({
        where: { email: userData.email },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya existe un usuario con ese email',
        });
      }
      
      // Crear usuario (por ahora sin hash, después implementar bcrypt)
      // TODO: Hash del password
      const newUser = await ctx.prisma.staffUser.create({
        data: userData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
      
      return newUser;
    }),

  // Listar todo el staff (solo admins)
  listStaff: adminProcedure
    .query(async ({ ctx }) => {
      const staff = await ctx.prisma.staffUser.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' },
        ],
      });
      
      return staff;
    }),

  // Actualizar miembro del staff (solo admins)
  updateStaff: adminProcedure
    .input(updateStaffSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const updatedUser = await ctx.prisma.staffUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          updatedAt: true,
        },
      });
      
      return updatedUser;
    }),

  // Desactivar miembro del staff (solo admins)
  deactivateStaff: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.staffUser.update({
        where: { id: input.id },
        data: { isActive: false },
      });
      
      return { success: true };
    }),
});
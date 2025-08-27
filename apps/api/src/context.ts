// tRPC Context - Información compartida entre todas las rutas
// Incluye autenticación, base de datos y configuración

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@ordo/database';

export interface CreateContextOptions {
  req: Request;
  res: Response;
}

export interface Context {
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
    role: string;
  } | undefined;
  req: Request;
  res: Response;
}

export const createContext = async ({ req, res }: CreateContextOptions): Promise<Context> => {
  // Extraer token de autenticación
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  let user = undefined;
  
  if (token) {
    try {
      // Verificar JWT token
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret') as any;
      
      // Buscar usuario en la base de datos
      if (decoded.userId) {
        const staffUser = await prisma.staffUser.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, role: true, isActive: true }
        });
        
        if (staffUser && staffUser.isActive) {
          user = {
            id: staffUser.id,
            email: staffUser.email,
            role: staffUser.role
          };
        }
      }
    } catch (error) {
      // Token inválido, continuar sin usuario autenticado
      console.log('🔒 Invalid token:', error);
    }
  }

  return {
    prisma,
    user,
    req,
    res,
  };
};

export type { Context as TRPCContext };
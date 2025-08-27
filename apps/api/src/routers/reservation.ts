// Reservation Router - Sistema de reservas
// Gestión completa de reservas de mesas

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
const createReservationSchema = z.object({
  customerName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  customerPhone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  reservationDate: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'La fecha debe ser hoy o en el futuro'),
  reservationTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  partySize: z.number().int().min(1).max(20, 'Máximo 20 personas por reserva'),
  tablePreferences: z.string().optional(),
  specialRequests: z.string().optional(),
});

const updateReservationSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
  tablePreferences: z.string().optional(),
  specialRequests: z.string().optional(),
});

const getAvailableTimesSchema = z.object({
  date: z.string(),
  partySize: z.number().int().min(1),
});

export const reservationRouter = t.router({
  // === CREAR RESERVAS ===

  // Crear nueva reserva (público)
  create: publicProcedure
    .input(createReservationSchema)
    .mutation(async ({ input, ctx }) => {
      const { customerPhone, customerName, reservationDate, reservationTime, ...reservationData } = input;
      
      // Verificar que el restaurante acepta reservas
      const config = await ctx.prisma.restaurantConfig.findFirst({
        where: { isActive: true },
      });
      
      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Configuración del restaurante no encontrada',
        });
      }
      
      const services = config.services as any;
      if (!services.reservations) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Este restaurante no acepta reservas en línea',
        });
      }
      
      // Verificar horarios de operación
      const selectedDate = new Date(reservationDate);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[selectedDate.getDay()];
      const openingHours = config.openingHours as any;
      const daySchedule = openingHours[dayOfWeek];
      
      if (!daySchedule || daySchedule.is_closed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El restaurante está cerrado el día seleccionado',
        });
      }
      
      // Verificar que la hora esté dentro del horario de operación
      const [hours, minutes] = reservationTime.split(':').map(Number);
      const reservationMinutes = hours * 60 + minutes;
      
      const [openHours, openMinutes] = daySchedule.open.split(':').map(Number);
      const [closeHours, closeMinutes] = daySchedule.close.split(':').map(Number);
      const openMinutesTotal = openHours * 60 + openMinutes;
      const closeMinutesTotal = closeHours * 60 + closeMinutes;
      
      if (reservationMinutes < openMinutesTotal || reservationMinutes > closeMinutesTotal - 120) { // 2 horas antes del cierre
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Las reservas deben ser entre ${daySchedule.open} y ${closeHours - 2}:${closeMinutes.toString().padStart(2, '0')}`,
        });
      }
      
      // Crear o encontrar cliente
      let customer = await ctx.prisma.customer.findUnique({
        where: { phone: customerPhone },
      });
      
      if (!customer) {
        customer = await ctx.prisma.customer.create({
          data: {
            phone: customerPhone,
            name: customerName,
            addresses: [],
          },
        });
      }
      
      // Crear la reserva
      const reservation = await ctx.prisma.reservation.create({
        data: {
          customerId: customer.id,
          customerName,
          customerPhone,
          reservationDate: new Date(reservationDate),
          reservationTime: `${reservationTime}:00`, // Agregar segundos para TIME format
          ...reservationData,
        },
        include: {
          customer: true,
        },
      });
      
      return reservation;
    }),

  // === CONSULTAR RESERVAS ===

  // Obtener horarios disponibles (público)
  getAvailableTimes: publicProcedure
    .input(getAvailableTimesSchema)
    .query(async ({ input, ctx }) => {
      const { date, partySize } = input;
      
      // Obtener configuración del restaurante
      const config = await ctx.prisma.restaurantConfig.findFirst({
        where: { isActive: true },
      });
      
      if (!config) {
        return { availableTimes: [], message: 'Restaurante no configurado' };
      }
      
      const services = config.services as any;
      if (!services.reservations) {
        return { availableTimes: [], message: 'Reservas no disponibles' };
      }
      
      // Verificar día de la semana y horarios
      const selectedDate = new Date(date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[selectedDate.getDay()];
      const openingHours = config.openingHours as any;
      const daySchedule = openingHours[dayOfWeek];
      
      if (!daySchedule || daySchedule.is_closed) {
        return { availableTimes: [], message: 'Restaurante cerrado este día' };
      }
      
      // Generar slots de tiempo cada 30 minutos
      const [openHours, openMinutes] = daySchedule.open.split(':').map(Number);
      const [closeHours, closeMinutes] = daySchedule.close.split(':').map(Number);
      
      const slots = [];
      let currentMinutes = openHours * 60 + openMinutes;
      const closeMinutesTotal = closeHours * 60 + closeMinutes - 120; // 2 horas antes del cierre
      
      while (currentMinutes <= closeMinutesTotal) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        slots.push(timeString);
        currentMinutes += 30; // Slots cada 30 minutos
      }
      
      // Obtener reservas existentes para ese día
      const existingReservations = await ctx.prisma.reservation.findMany({
        where: {
          reservationDate: selectedDate,
          status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
        },
      });
      
      // TODO: Implementar lógica de capacidad de mesas
      // Por ahora, asumimos que cada slot puede tener máximo 3 reservas
      const reservationCounts = existingReservations.reduce((acc: any, res) => {
        const timeKey = res.reservationTime.toString().slice(0, 5); // HH:MM
        acc[timeKey] = (acc[timeKey] || 0) + 1;
        return acc;
      }, {});
      
      const availableTimes = slots.filter(time => (reservationCounts[time] || 0) < 3);
      
      return {
        availableTimes,
        message: availableTimes.length > 0 ? null : 'No hay horarios disponibles para este día',
      };
    }),

  // Listar reservas del cliente (público con teléfono)
  getByPhone: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input, ctx }) => {
      const reservations = await ctx.prisma.reservation.findMany({
        where: { customerPhone: input.phone },
        orderBy: { reservationDate: 'desc' },
        take: 10,
      });
      
      return reservations;
    }),

  // Obtener reserva por ID (público)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const reservation = await ctx.prisma.reservation.findUnique({
        where: { id: input.id },
        include: { customer: true },
      });
      
      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reserva no encontrada',
        });
      }
      
      return reservation;
    }),

  // Listar reservas del día (staff)
  getTodayReservations: staffProcedure
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          reservationDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: { customer: true },
        orderBy: { reservationTime: 'asc' },
      });
      
      return reservations;
    }),

  // Listar próximas reservas (staff)
  getUpcoming: staffProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input, ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + input.days);
      
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          reservationDate: {
            gte: today,
            lte: futureDate,
          },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { customer: true },
        orderBy: [
          { reservationDate: 'asc' },
          { reservationTime: 'asc' },
        ],
      });
      
      return reservations;
    }),

  // === ACTUALIZAR RESERVAS ===

  // Actualizar reserva (staff)
  update: staffProcedure
    .input(updateReservationSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const reservation = await ctx.prisma.reservation.update({
        where: { id },
        data: updateData,
        include: { customer: true },
      });
      
      return reservation;
    }),

  // Confirmar reserva (staff)
  confirm: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const reservation = await ctx.prisma.reservation.update({
        where: { id: input.id },
        data: { status: 'CONFIRMED' },
        include: { customer: true },
      });
      
      // TODO: Enviar confirmación via WhatsApp
      
      return reservation;
    }),

  // Marcar como sentado (staff)
  markSeated: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const reservation = await ctx.prisma.reservation.update({
        where: { id: input.id },
        data: { status: 'SEATED' },
        include: { customer: true },
      });
      
      return reservation;
    }),

  // Cancelar reserva (público con validación o staff)
  cancel: publicProcedure
    .input(z.object({ 
      id: z.string(),
      phone: z.string().optional(), // Para validación pública
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, phone } = input;
      
      // Si no hay usuario autenticado, validar que el teléfono coincida
      if (!ctx.user && phone) {
        const reservation = await ctx.prisma.reservation.findUnique({
          where: { id },
        });
        
        if (!reservation || reservation.customerPhone !== phone) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tienes permiso para cancelar esta reserva',
          });
        }
      }
      
      const reservation = await ctx.prisma.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      
      return reservation;
    }),

  // === ESTADÍSTICAS ===

  // Estadísticas de reservas (staff)
  getStats: staffProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      
      const reservations = await ctx.prisma.reservation.findMany({
        where: {
          reservationDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      
      const stats = {
        totalReservations: reservations.length,
        byStatus: {
          PENDING: 0,
          CONFIRMED: 0,
          SEATED: 0,
          COMPLETED: 0,
          CANCELLED: 0,
          NO_SHOW: 0,
        },
        averagePartySize: 0,
        peakTimes: new Map(),
      };
      
      let totalGuests = 0;
      
      reservations.forEach(reservation => {
        stats.byStatus[reservation.status]++;
        totalGuests += reservation.partySize;
        
        const timeSlot = reservation.reservationTime.toString().slice(0, 2) + ':00'; // Agrupar por hora
        stats.peakTimes.set(timeSlot, (stats.peakTimes.get(timeSlot) || 0) + 1);
      });
      
      stats.averagePartySize = stats.totalReservations > 0 ? totalGuests / stats.totalReservations : 0;
      
      return {
        ...stats,
        peakTimes: Array.from(stats.peakTimes.entries())
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => b.count - a.count),
      };
    }),
});
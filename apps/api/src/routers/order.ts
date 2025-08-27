// Order Router - Sistema completo de pedidos
// Gestión de pedidos: creación, actualización, seguimiento

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { Context } from '../context';
import { dbUtils } from '@ordo/database';

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
const kitchenProcedure = t.procedure.use(requireRole(['ADMIN', 'KITCHEN']));

// Esquemas de validación
const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  specialInstructions: z.string().optional(),
  modifiers: z.array(z.object({
    modifierId: z.string(),
    selectedOptions: z.array(z.string()).optional(),
  })).optional(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'TAKEOUT', 'DELIVERY']),
  items: z.array(orderItemSchema).min(1),
  customerInfo: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional(),
  }),
  deliveryAddress: z.object({
    street: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    references: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  tableNumber: z.number().int().optional(),
  specialInstructions: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
});

const updateOrderStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
  estimatedReadyTime: z.date().optional(),
});

export const orderRouter = t.router({
  // === CREAR PEDIDOS ===

  // Crear nuevo pedido (público)
  create: publicProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const { items: orderItems, customerInfo, deliveryAddress, ...orderData } = input;
      
      // Validar items y calcular precios
      let subtotal = 0;
      const processedItems = [];
      
      for (const item of orderItems) {
        const menuItem = await ctx.prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { modifiers: true },
        });
        
        if (!menuItem || !menuItem.isAvailable) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Item no disponible: ${item.menuItemId}`,
          });
        }
        
        let itemPrice = Number(menuItem.price);
        let modifiersApplied = [];
        
        // Procesar modificadores si existen
        if (item.modifiers) {
          for (const mod of item.modifiers) {
            const modifier = menuItem.modifiers.find(m => m.id === mod.modifierId);
            if (modifier) {
              itemPrice += Number(modifier.priceAdjustment);
              modifiersApplied.push({
                id: modifier.id,
                name: modifier.name,
                priceAdjustment: Number(modifier.priceAdjustment),
                selectedOptions: mod.selectedOptions,
              });
            }
          }
        }
        
        const totalItemPrice = itemPrice * item.quantity;
        subtotal += totalItemPrice;
        
        processedItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: itemPrice,
          totalPrice: totalItemPrice,
          specialInstructions: item.specialInstructions,
          modifiers: modifiersApplied.length > 0 ? modifiersApplied : undefined,
          menuItem: { connect: { id: item.menuItemId } },
        });
      }
      
      // Calcular delivery fee si es delivery
      let deliveryFee = 0;
      if (orderData.orderType === 'DELIVERY') {
        const config = await ctx.prisma.restaurantConfig.findFirst({
          where: { isActive: true },
        });
        
        if (config?.deliveryConfig) {
          const deliveryConfig = config.deliveryConfig as any;
          deliveryFee = deliveryConfig.fee || 0;
          
          // Verificar mínimo de pedido
          if (subtotal < deliveryConfig.minimum_order) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: `El pedido mínimo para delivery es $${deliveryConfig.minimum_order}`,
            });
          }
          
          // Delivery gratis si supera cierto monto
          if (deliveryConfig.is_free_over_amount && subtotal >= deliveryConfig.is_free_over_amount) {
            deliveryFee = 0;
          }
        }
      }
      
      // Calcular totales
      const totals = dbUtils.calculateOrderTotal(subtotal, 0.16, deliveryFee, 0, 0);
      
      // Crear o encontrar cliente
      let customer = await ctx.prisma.customer.findUnique({
        where: { phone: customerInfo.phone },
      });
      
      if (!customer) {
        const customerData: any = {
          phone: customerInfo.phone,
          name: customerInfo.name,
          email: customerInfo.email,
          addresses: [],
        };
        
        if (deliveryAddress) {
          customerData.addresses = [deliveryAddress];
        }
        
        customer = await ctx.prisma.customer.create({
          data: customerData,
        });
      } else {
        // Actualizar información del cliente si es necesario
        const updateData: any = {};
        if (!customer.name && customerInfo.name) updateData.name = customerInfo.name;
        if (!customer.email && customerInfo.email) updateData.email = customerInfo.email;
        
        if (Object.keys(updateData).length > 0) {
          customer = await ctx.prisma.customer.update({
            where: { id: customer.id },
            data: updateData,
          });
        }
      }
      
      // Crear el pedido
      const orderNumber = dbUtils.generateOrderNumber();
      
      const order = await ctx.prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          orderType: orderData.orderType,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          deliveryFee: totals.deliveryFee,
          total: totals.total,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          deliveryAddress: deliveryAddress || undefined,
          tableNumber: orderData.tableNumber,
          specialInstructions: orderData.specialInstructions,
          paymentMethod: orderData.paymentMethod,
          orderItems: {
            create: processedItems,
          },
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
          customer: true,
        },
      });
      
      return order;
    }),

  // === CONSULTAR PEDIDOS ===

  // Obtener pedido por número (público)
  getByOrderNumber: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { orderNumber: input.orderNumber },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
          customer: true,
        },
      });
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pedido no encontrado',
        });
      }
      
      return order;
    }),

  // Listar pedidos activos (staff)
  getActiveOrders: staffProcedure
    .query(async ({ ctx }) => {
      const orders = await ctx.prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
          },
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      
      return orders;
    }),

  // Listar pedidos del día (staff)
  getTodayOrders: staffProcedure
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const orders = await ctx.prisma.order.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      return orders;
    }),

  // Pedidos para cocina (kitchen staff)
  getKitchenOrders: kitchenProcedure
    .query(async ({ ctx }) => {
      const orders = await ctx.prisma.order.findMany({
        where: {
          status: {
            in: ['CONFIRMED', 'PREPARING'],
          },
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      
      return orders.map(order => ({
        ...order,
        elapsedMinutes: Math.floor((new Date().getTime() - order.createdAt.getTime()) / (1000 * 60)),
        estimatedReadyTime: order.estimatedReadyTime || 
          new Date(order.createdAt.getTime() + (30 * 60 * 1000)), // 30 min default
      }));
    }),

  // === ACTUALIZAR PEDIDOS ===

  // Actualizar estado del pedido (staff)
  updateStatus: staffProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, status, estimatedReadyTime } = input;
      
      const updateData: any = { status };
      
      // Establecer timestamps según el estado
      if (status === 'READY') {
        updateData.readyAt = new Date();
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }
      
      if (estimatedReadyTime) {
        updateData.estimatedReadyTime = estimatedReadyTime;
      }
      
      const order = await ctx.prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
      });
      
      // TODO: Enviar notificación al cliente via WhatsApp/Push
      
      return order;
    }),

  // Confirmar pago (staff)
  confirmPayment: staffProcedure
    .input(z.object({
      id: z.string(),
      paymentReference: z.string().optional(),
      tipAmount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, paymentReference, tipAmount } = input;
      
      const updateData: any = {
        paymentStatus: 'PAID',
      };
      
      if (paymentReference) updateData.paymentReference = paymentReference;
      
      if (tipAmount && tipAmount > 0) {
        const order = await ctx.prisma.order.findUnique({
          where: { id },
          select: { subtotal: true, taxAmount: true, deliveryFee: true, discountAmount: true },
        });
        
        if (order) {
          updateData.tipAmount = tipAmount;
          updateData.total = Number(order.subtotal) + Number(order.taxAmount) + 
            Number(order.deliveryFee) + tipAmount - Number(order.discountAmount);
        }
      }
      
      const updatedOrder = await ctx.prisma.order.update({
        where: { id },
        data: updateData,
      });
      
      return updatedOrder;
    }),

  // === ESTADÍSTICAS ===

  // Estadísticas de ventas (staff)
  getSalesStats: staffProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      
      const orders = await ctx.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          paymentStatus: 'PAID',
        },
        include: {
          orderItems: {
            include: { menuItem: true },
          },
        },
      });
      
      const stats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + Number(order.total), 0),
        averageOrderValue: 0,
        ordersByType: {
          DINE_IN: 0,
          TAKEOUT: 0,
          DELIVERY: 0,
        },
        popularItems: new Map(),
      };
      
      stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
      
      orders.forEach(order => {
        stats.ordersByType[order.orderType]++;
        
        order.orderItems.forEach(item => {
          const key = item.menuItem.name;
          const current = stats.popularItems.get(key) || { quantity: 0, revenue: 0 };
          stats.popularItems.set(key, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + Number(item.totalPrice),
          });
        });
      });
      
      return {
        ...stats,
        popularItems: Array.from(stats.popularItems.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10),
      };
    }),
});
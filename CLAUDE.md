# CLAUDE.md - Información Esencial del Desarrollo

## Información del Proyecto
**Nombre**: Ordo - Sistema de Gestión para Restaurantes
**Tipo**: PWA Individual personalizada por restaurante (NO multitenant)
**Arquitectura**: Monorepo con múltiples apps

## Configuración Técnica Esencial

### Stack Tecnológico
- **Frontend**: Next.js 14+ con App Router
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand
- **Backend**: Express.js + tRPC
- **Base de Datos**: PostgreSQL + Redis
- **Hosting**: Railway (requiere código precompilado)
- **Autenticación**: NextAuth.js + JWT
- **Pagos**: Stripe + métodos mexicanos (SPEI, OXXO)
- **Notificaciones**: WhatsApp Business API + Web Push

### Estructura del Proyecto
```
ordo/
├── apps/
│   ├── client/          # PWA para clientes
│   ├── admin/           # Panel de administración
│   ├── kitchen/         # Kitchen Display System
│   └── api/             # Backend API
├── packages/
│   ├── database/        # Prisma schemas
│   ├── ui/              # Componentes compartidos
│   └── config/          # Configuraciones
└── railway.json
```

### Comandos Importantes
```bash
# Desarrollo
npm run dev

# Build para Railway (requiere código precompilado)
npm run build

# Testing
npm run test

# Lint y TypeCheck
npm run lint
npm run typecheck
```

### Variables de Entorno Críticas
```env
# Database
DATABASE_URL=postgresql://postgres:myZKEVDbnppIZINvbSEyWWlPRsKQgeDH@trolley.proxy.rlwy.net:31671/ordo
REDIS_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Pagos
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=

# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### Consideraciones Específicas de Railway
- Railway requiere código **precompilado** en el build
- Usar `railway.json` para configurar servicios
- Variables de entorno se comparten entre servicios con sintaxis `${{ServiceName.VARIABLE}}`
- Soporte nativo para PostgreSQL y Redis

### Diferenciadores del Proyecto
1. **Una app por restaurante** (NO multitenant)
2. **Branding personalizado completo**
3. **Sin competencia en la misma app**
4. **WhatsApp Business integration**
5. **Pagos mexicanos nativos**
6. **Relación directa cliente-restaurante**

### Notas de Desarrollo
- Siempre verificar que las dependencias existan en package.json antes de usarlas
- Seguir convenciones del codebase existente
- Nunca exponer secrets en el código
- Priorizar performance para PWA
- Optimizar para móviles (restaurant industry)

### Comandos Específicos del Proyecto
```bash
# Backend Development
npm run dev                        # Desarrollo completo
cd apps/api && npm run dev        # Solo API (puerto 4000)
npm run db:generate               # Generar Prisma Client
npm run db:push                   # Sync schema a DB
npm run db:studio                 # Prisma Studio (puerto 5555)

# Testing
curl http://localhost:4000/health              # Health Express
curl http://localhost:4000/trpc/health.check   # Health tRPC

# Próximos comandos a implementar:
# npm run seed                      # Datos de prueba
# npm run dev:client               # PWA cliente
# npm run dev:admin               # Panel admin
# npm run build:all              # Build completo
# npm run deploy:railway         # Deploy a Railway
```

## Experiencias de Desarrollos Anteriores
- **Railway**: Requiere código precompilado en el build process
- **Next.js**: Usar App Router para mejor performance y SEO
- **PWA**: Configurar correctamente service workers para offline functionality
- **TypeScript**: Mantener strict mode habilitado
- **Prisma**: 
  - ⚠️ **CRÍTICO**: Mantener schema de Prisma ÚNICAMENTE en la raíz del proyecto
  - **NO crear** esquemas duplicados en carpetas server/ o backend/
  - Esquemas duplicados causan problemas de sincronización y conflictos
  - **Mejor práctica**: Un solo prisma/schema.prisma en raíz, compartido por todas las apps
  - Usar migrations para cambios de schema en producción
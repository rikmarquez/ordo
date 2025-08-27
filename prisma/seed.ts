import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Crear usuario demo
  const hashedPassword = await bcrypt.hash('demo123', 12)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@restaurant.com' },
    update: {},
    create: {
      email: 'demo@restaurant.com',
      name: 'Usuario Demo',
      password: hashedPassword,
      phone: '+52 55 1234 5678',
      role: 'CUSTOMER',
    },
  })

  console.log('✅ Demo user created:', demoUser.email)

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {},
    create: {
      email: 'admin@restaurant.com',
      name: 'Admin Usuario',
      password: adminPassword,
      phone: '+52 55 9876 5432',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Crear configuración del restaurante
  const restaurant = await prisma.restaurantConfig.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Restaurante Demo',
      slug: 'demo-restaurant',
      description: 'El mejor sabor de la ciudad',
      contactInfo: {
        phone: '+52 55 1234 5678',
        email: 'contacto@restaurant.com',
        whatsapp: '+52 55 1234 5678'
      },
      address: {
        street: 'Av. Principal 123',
        neighborhood: 'Centro',
        city: 'Ciudad de México',
        state: 'CDMX',
        postal_code: '01000',
        coordinates: { lat: 19.4326, lng: -99.1332 }
      },
      openingHours: {
        monday: { open: '09:00', close: '22:00', is_closed: false },
        tuesday: { open: '09:00', close: '22:00', is_closed: false },
        wednesday: { open: '09:00', close: '22:00', is_closed: false },
        thursday: { open: '09:00', close: '22:00', is_closed: false },
        friday: { open: '09:00', close: '23:00', is_closed: false },
        saturday: { open: '10:00', close: '23:00', is_closed: false },
        sunday: { open: '10:00', close: '21:00', is_closed: false }
      },
      services: {
        dine_in: true,
        takeout: true,
        delivery: true,
        reservations: true
      },
      deliveryConfig: {
        fee: 25,
        minimum_order: 150,
        delivery_radius_km: 5,
        estimated_time_minutes: 45
      },
      branding: {
        primary_color: '#FF6B35',
        secondary_color: '#2C3E50',
        logo_url: '/logo.png',
        favicon_url: '/favicon.ico',
        cover_image_url: '/restaurant-hero.jpg',
        custom_domain: null
      }
    }
  })

  console.log('✅ Restaurant config created:', restaurant.name)

  // Crear categorías del menú
  const categories = [
    { name: 'Entradas', description: 'Aperitivos y entradas' },
    { name: 'Platos Fuertes', description: 'Platillos principales' },
    { name: 'Bebidas', description: 'Bebidas frías y calientes' },
    { name: 'Postres', description: 'Dulces y postres' }
  ]

  for (const [index, categoryData] of categories.entries()) {
    const category = await prisma.menuCategory.upsert({
      where: { id: `category-${index + 1}` },
      update: {},
      create: {
        id: `category-${index + 1}`,
        name: categoryData.name,
        description: categoryData.description,
        sortOrder: index
      }
    })
    console.log(`✅ Category created: ${category.name}`)
  }

  // Crear algunos items del menú
  const menuItems = [
    {
      categoryId: 'category-1',
      name: 'Guacamole Tradicional',
      description: 'Aguacate fresco con cebolla, tomate, cilantro y chile',
      price: 85,
      ingredients: ['aguacate', 'cebolla', 'tomate', 'cilantro', 'chile'],
      allergens: []
    },
    {
      categoryId: 'category-2',
      name: 'Tacos de Carnitas',
      description: 'Tres tacos de carnitas con cebolla, cilantro y salsa verde',
      price: 95,
      ingredients: ['carne de cerdo', 'tortilla', 'cebolla', 'cilantro'],
      allergens: ['gluten']
    },
    {
      categoryId: 'category-2',
      name: 'Quesadilla de Queso',
      description: 'Tortilla de harina rellena de queso Oaxaca',
      price: 75,
      ingredients: ['tortilla de harina', 'queso oaxaca'],
      allergens: ['gluten', 'lácteos']
    },
    {
      categoryId: 'category-3',
      name: 'Agua de Horchata',
      description: 'Bebida tradicional de arroz con canela',
      price: 35,
      ingredients: ['arroz', 'canela', 'azúcar'],
      allergens: []
    },
    {
      categoryId: 'category-4',
      name: 'Flan Napolitano',
      description: 'Postre tradicional con caramelo',
      price: 55,
      ingredients: ['huevos', 'leche', 'azúcar'],
      allergens: ['huevos', 'lácteos']
    }
  ]

  for (const [index, itemData] of menuItems.entries()) {
    const menuItem = await prisma.menuItem.upsert({
      where: { id: `item-${index + 1}` },
      update: {},
      create: {
        id: `item-${index + 1}`,
        categoryId: itemData.categoryId,
        name: itemData.name,
        description: itemData.description,
        price: itemData.price,
        imageUrls: [],
        ingredients: itemData.ingredients,
        allergens: itemData.allergens,
        dietaryInfo: {
          vegetarian: !itemData.ingredients.some(ing => 
            ['carne', 'pollo', 'pescado'].some(meat => ing.includes(meat))
          ),
          vegan: false,
          gluten_free: !itemData.allergens.includes('gluten'),
          spicy_level: 0
        }
      }
    })
    console.log(`✅ Menu item created: ${menuItem.name}`)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
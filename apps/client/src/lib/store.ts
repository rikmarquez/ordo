import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { signOut } from 'next-auth/react'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

interface Restaurant {
  id: string
  name: string
  description?: string
  imageUrl?: string
  address?: string
  phone?: string
}

interface User {
  id: string
  name: string
  email: string
  role?: string
}

interface AppState {
  // Cart state
  cartItems: CartItem[]
  addToCart: (item: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  
  // Restaurant state
  restaurant: Restaurant | null
  setRestaurant: (restaurant: Restaurant) => void
  
  // Auth state
  isAuthenticated: boolean
  user: User | null
  login: (user: User) => void
  logout: () => Promise<void>
  syncWithSession: (session: any) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Cart state
      cartItems: [],
      addToCart: (item) => set((state) => {
        const existingItem = state.cartItems.find(cartItem => cartItem.id === item.id)
        if (existingItem) {
          return {
            cartItems: state.cartItems.map(cartItem =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            )
          }
        }
        return {
          cartItems: [...state.cartItems, { ...item, quantity: 1 }]
        }
      }),
      removeFromCart: (id) => set((state) => ({
        cartItems: state.cartItems.filter(item => item.id !== id)
      })),
      updateQuantity: (id, quantity) => set((state) => {
        if (quantity <= 0) {
          return {
            cartItems: state.cartItems.filter(item => item.id !== id)
          }
        }
        return {
          cartItems: state.cartItems.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        }
      }),
      clearCart: () => set({ cartItems: [] }),
      getCartTotal: () => {
        const { cartItems } = get()
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      },
      
      // Restaurant state
      restaurant: null,
      setRestaurant: (restaurant) => set({ restaurant }),
      
      // Auth state
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: async () => {
        // Clear local storage
        localStorage.removeItem('auth_token')
        // Sign out from NextAuth
        await signOut({ redirect: false })
        // Clear store state
        set({ isAuthenticated: false, user: null, cartItems: [] })
      },
      syncWithSession: (session) => {
        if (session?.user) {
          set({
            isAuthenticated: true,
            user: {
              id: session.user.id || session.user.email,
              name: session.user.name || '',
              email: session.user.email || '',
              role: session.user.role || 'CUSTOMER',
            }
          })
        } else {
          set({ isAuthenticated: false, user: null })
        }
      },
    }),
    {
      name: 'ordo-app-storage',
      partialize: (state) => ({
        cartItems: state.cartItems,
        restaurant: state.restaurant,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
)
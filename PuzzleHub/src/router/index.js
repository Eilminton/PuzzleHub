import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import { supabase } from '../supabase' // Import supabase for initial session check

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }, // Protect this route
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

router.beforeEach(async (to) => { // Removed 'from', 'next' parameters
  const authStore = useAuthStore()

  // Ensure the auth state is initialized (especially on first load)
  // This will try to get the session from Supabase if not already set
  if (authStore.user === null) {
      const { data: { session } } = await supabase.auth.getSession()
      authStore.user = session?.user || null
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = authStore.user !== null

  if (requiresAuth && !isAuthenticated) {
    return '/login' // Return path instead of next('/login')
  } else if (to.name === 'login' && isAuthenticated) {
    return '/' // Return path instead of next('/')
  }
  // No explicit return means next() is called implicitly
})

export default router

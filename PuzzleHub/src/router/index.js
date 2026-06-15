import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import SudokuEditorView from '../views/SudokuEditorView.vue'
import SudokuLibraryView from '../views/SudokuLibraryView.vue'
import { supabase } from '../supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/sudoku',
      name: 'sudoku-library',
      component: SudokuLibraryView,
      meta: { requiresAuth: true },
    },
    {
      path: '/sudoku/:id',
      name: 'sudoku-editor',
      component: SudokuEditorView,
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.user === null) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    authStore.user = session?.user || null
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = authStore.user !== null

  if (requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }
})

export default router

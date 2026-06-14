import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  // Check user session on store initialization
  supabase.auth.getSession().then(({ data }) => {
    user.value = data.session?.user || null
  })

  supabase.auth.onAuthStateChange((_, session) => {
    user.value = session?.user || null
  })

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
    if (error) throw error
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
  }

  return { user, login, logout }
})

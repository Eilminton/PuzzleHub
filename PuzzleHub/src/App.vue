<template>
  <div id="app-container">
    <header v-if="authStore.user" class="app-header">
      <h1>PuzzleHub</h1>
      <nav>
        <button @click="handleLogout" class="logout-btn">Abmelden</button>
      </nav>
    </header>
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  try {
    await authStore.logout()
    // Redirect to login page after logout
    router.push({ name: 'login' })
  } catch (error) {
    console.error('Logout error:', error.message)
  }
}
</script>

<style>
/* Global styles */
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  color: #333;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.logout-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.logout-btn:hover {
  background-color: #c0392b;
}
</style>

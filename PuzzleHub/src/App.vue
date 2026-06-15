<template>
  <div class="app-shell">
    <header v-if="authStore.user" class="app-header">
      <div class="brand">
        <p class="eyebrow">Couple Puzzle Hub</p>
        <h1>PuzzleHub</h1>
      </div>

      <nav class="header-nav">
        <RouterLink :to="{ name: 'home' }" class="nav-link" :class="{ active: isHome }">
          Hub
        </RouterLink>
        <RouterLink :to="{ name: 'sudoku-library' }" class="nav-link" :class="{ active: isSudoku }">
          Sudoku
        </RouterLink>
        <button @click="handleLogout" class="logout-btn">Abmelden</button>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const isHome = computed(() => route.name === 'home')
const isSudoku = computed(() => route.name === 'sudoku-library' || route.name === 'sudoku-editor')

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push({ name: 'login' })
  } catch (error) {
    console.error('Logout error:', error.message)
  }
}
</script>

<style>
:root {
  color-scheme: dark;
  --bg: #08111f;
  --bg-soft: rgba(16, 24, 40, 0.78);
  --panel: rgba(9, 16, 31, 0.86);
  --panel-border: rgba(255, 255, 255, 0.08);
  --text: #eef2ff;
  --muted: rgba(238, 242, 255, 0.72);
  --accent: #f2c14e;
  --accent-strong: #f08a24;
  --danger: #ef5b5b;
  --success: #5dd39e;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(242, 193, 78, 0.2), transparent 28%),
    radial-gradient(circle at top right, rgba(93, 211, 158, 0.14), transparent 24%),
    linear-gradient(180deg, #09111f 0%, #07101b 45%, #050b14 100%);
  font-family:
    'Avenir Next',
    'Trebuchet MS',
    'Segoe UI',
    sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(4, 9, 17, 0.74);
  border-bottom: 1px solid var(--panel-border);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand h1 {
  margin: 0.1rem 0 0;
  font-size: 1.35rem;
  letter-spacing: 0.02em;
}

.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav-link,
.logout-btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.7rem 1rem;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.nav-link {
  color: var(--muted);
  background: rgba(255, 255, 255, 0.03);
}

.nav-link.active {
  color: var(--text);
  border-color: rgba(242, 193, 78, 0.4);
  background: rgba(242, 193, 78, 0.1);
}

.logout-btn {
  color: white;
  background: linear-gradient(135deg, var(--danger), #d94848);
  cursor: pointer;
}

.nav-link:hover,
.logout-btn:hover {
  transform: translateY(-1px);
}

.app-main {
  min-height: calc(100vh - 72px);
}

@media (max-width: 720px) {
  .app-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-nav {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

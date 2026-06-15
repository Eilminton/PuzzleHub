<template>
  <div class="app-shell">
    <header v-if="authStore.user" class="app-header">
      <div class="header-top">
        <div class="brand">
          <p class="eyebrow">Couple Puzzle Hub</p>
          <h1>PuzzleHub</h1>
        </div>

        <button
          type="button"
          class="menu-toggle"
          :aria-expanded="mobileNavOpen"
          aria-controls="mobile-navigation"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <span class="menu-toggle__label">{{ mobileNavOpen ? 'Schliessen' : 'Menü' }}</span>
          <span class="menu-toggle__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <nav id="mobile-navigation" class="header-nav" :class="{ open: mobileNavOpen }">
        <div class="user-badge" aria-label="Angemeldeter Benutzer">
          <span class="user-badge__label">Angemeldet als</span>
          <strong class="user-badge__name">{{ displayName }}</strong>
        </div>

        <div class="nav-links">
          <RouterLink
            :to="{ name: 'home' }"
            class="nav-link"
            :class="{ active: isHome }"
            @click="mobileNavOpen = false"
          >
            Hub
          </RouterLink>
          <RouterLink
            :to="{ name: 'sudoku-library' }"
            class="nav-link"
            :class="{ active: isSudoku }"
            @click="mobileNavOpen = false"
          >
            Sudoku
          </RouterLink>
          <button type="button" @click="handleLogout" class="logout-btn">Abmelden</button>
        </div>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useGameStore } from './stores/game'

const authStore = useAuthStore()
const gameStore = useGameStore()
const router = useRouter()
const route = useRoute()
const mobileNavOpen = ref(false)

const isHome = computed(() => route.name === 'home')
const isSudoku = computed(() => route.name === 'sudoku-library' || route.name === 'sudoku-editor')
const displayName = computed(() => gameStore.currentPlayerName)

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
  },
)

const handleLogout = async () => {
  try {
    await authStore.logout()
    mobileNavOpen.value = false
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
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
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
  display: grid;
  gap: 0.9rem;
  width: 100%;
  padding: clamp(0.85rem, 2.5vw, 1rem) clamp(0.85rem, 3vw, 1.25rem);
  background: rgba(4, 9, 17, 0.74);
  border-bottom: 1px solid var(--panel-border);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
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
  gap: 0.9rem;
  justify-content: space-between;
  width: 100%;
}

.user-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.65rem 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 0;
  flex: 1 1 180px;
  max-width: 100%;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-badge__label {
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.user-badge__name {
  color: var(--text);
  font-size: 0.98rem;
  font-weight: 700;
  text-align: center;
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

.menu-toggle {
  display: none;
  align-items: center;
  gap: 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.72rem 0.95rem;
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
}

.menu-toggle__label {
  font-size: 0.92rem;
  letter-spacing: 0.02em;
}

.menu-toggle__icon {
  display: inline-flex;
  flex-direction: column;
  gap: 0.22rem;
}

.menu-toggle__icon span {
  display: block;
  width: 1.15rem;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
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
    gap: 0.75rem;
  }

  .menu-toggle {
    display: inline-flex;
  }

  .header-nav {
    width: 100%;
    display: none;
    flex-direction: column;
    align-items: stretch;
  }

  .header-nav.open {
    display: flex;
  }

  .nav-links {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .nav-link,
  .logout-btn,
  .user-badge {
    width: 100%;
  }

  .user-badge {
    align-items: flex-start;
    flex: 1 1 auto;
  }

  .nav-link,
  .logout-btn {
    text-align: center;
  }
}

@media (min-width: 721px) {
  .app-header {
    padding-inline: min(2rem, 3vw);
  }
}
</style>

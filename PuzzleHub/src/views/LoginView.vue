<template>
  <div class="login-page">
    <section class="login-shell">
      <div class="login-shell__topbar">
        <div class="shell-brand">
          <p class="eyebrow">Couple Puzzle Hub</p>
          <h1>PuzzleHub</h1>
        </div>
        <div class="shell-pill">Shared Space</div>
      </div>

      <div class="login-hero">
        <div class="login-copy">
          <p class="eyebrow">Welcome back</p>
          <h2>Log dich ein und spielen!!! :-) yehe</h2>
          <p class="lead">Supidupi han dech lieb han chli Sklave AI dezue bracht das do crafte.</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-card">
          <div class="card-head">
            <span class="card-chip">Meh oder weniger Secure login</span>
            <h3>Anmelden</h3>
          </div>

          <label class="field">
            <span>E-Mail</span>
            <input type="email" id="email" v-model="email" placeholder="du@beispiel.ch" required />
          </label>

          <label class="field">
            <span>Passwort</span>
            <input
              type="password"
              id="password"
              v-model="password"
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            {{ isLoading ? 'Anmelden...' : 'Anmelden' }}
          </button>

          <p v-if="error" class="error-message">{{ error }}</p>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref(null)

const authStore = useAuthStore()
const router = useRouter()

const handleLogin = async () => {
  isLoading.value = true
  error.value = null

  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}

.login-shell {
  width: min(100%, 1120px);
  padding: 1.2rem;
  border-radius: 34px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(7, 12, 22, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(16px);
}

.login-shell__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0.4rem 1rem;
}

.shell-brand h1 {
  margin: 0.15rem 0 0;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
}

.shell-pill {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(242, 193, 78, 0.14);
  border: 1px solid rgba(242, 193, 78, 0.24);
  color: #ffe6a6;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.login-hero {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 1.5rem;
  align-items: stretch;
}

.login-copy {
  padding: 2rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(242, 193, 78, 0.18), transparent 28%),
    rgba(9, 16, 31, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 420px;
}

.eyebrow {
  margin: 0;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
}

h2 {
  margin: 0.6rem 0 0;
  font-size: clamp(2.2rem, 5vw, 4rem);
  line-height: 1.02;
  max-width: 10ch;
}

.lead {
  margin: 1rem 0 0;
  max-width: 44ch;
  color: var(--muted);
  font-size: 1.05rem;
}

.login-card {
  padding: 2rem;
  border-radius: 28px;
  background: rgba(9, 16, 31, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-head h3 {
  margin: 0;
  font-size: 1.6rem;
}

.card-chip {
  align-self: flex-start;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(242, 193, 78, 0.14);
  color: #ffe6a6;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field span {
  color: var(--muted);
  font-size: 0.88rem;
  letter-spacing: 0.04em;
}

.field input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.field input::placeholder {
  color: rgba(238, 242, 255, 0.35);
}

.field input:focus {
  border-color: rgba(242, 193, 78, 0.45);
  box-shadow: 0 0 0 4px rgba(242, 193, 78, 0.12);
  transform: translateY(-1px);
}

.submit-btn {
  margin-top: 0.25rem;
  border: 0;
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #111827;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(240, 138, 36, 0.25);
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.error-message {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  background: rgba(239, 91, 91, 0.12);
  border: 1px solid rgba(239, 91, 91, 0.22);
  color: #ffd4d4;
}

@media (max-width: 900px) {
  .login-hero {
    grid-template-columns: 1fr;
  }

  .login-shell__topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .login-copy {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 1rem;
  }

  .login-shell {
    padding: 0.8rem;
    border-radius: 28px;
  }

  .login-copy,
  .login-card {
    padding: 1.25rem;
    border-radius: 24px;
  }
}
</style>

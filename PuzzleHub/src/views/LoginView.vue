<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Anmelden</h2>
      <div class="form-group">
        <label for="email">E-Mail:</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Passwort:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Anmelden...' : 'Anmelden' }}
      </button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </form>
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
    router.push('/') // Redirect to home on successful login
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  padding: 1rem;
  box-sizing: border-box;
}

.login-form {
  background: white;
  padding: 2.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 1.8rem;
  color: #2c3e50;
  font-size: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.6rem;
  font-weight: bold;
  color: #34495e;
  font-size: 1rem;
}

.form-group input[type='email'],
.form-group input[type='password'] {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.form-group input[type='email']:focus,
.form-group input[type='password']:focus {
  border-color: #42b983;
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2);
}

button[type='submit'] {
  width: 100%;
  padding: 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

button[type='submit']:hover:not(:disabled) {
  background-color: #36a16d;
  transform: translateY(-2px);
}

button[type='submit']:disabled {
  background-color: #a8d9c2;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  margin-top: 1rem;
  font-weight: bold;
}
</style>

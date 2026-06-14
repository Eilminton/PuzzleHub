<template>
  <div class="game-view">
    <div v-if="gameStore.isLoading" class="loading-spinner">Lade...</div>

    <div v-if="authStore.user && gameStore.gameStatus === 'idle'" class="idle-state">
      <h2>Willkommen!</h2>
      <p>Kein aktives Spiel gefunden.</p>
      <button @click="gameStore.startNewGame('easy')">Neues Spiel starten</button>
      <p class="waiting-for-lobby">
        Oder warte, bis ein anderes Spiel erstellt wird. Du wirst automatisch beitreten.
      </p>
    </div>

    <div v-if="gameStore.gameStatus === 'waiting'" class="waiting-state">
      <h2>Warte auf Partner...</h2>
      <p>Dein Spiel ist bereit. Sobald ein Partner beitritt, geht es los.</p>
      <div class="loading-spinner"></div>
    </div>

    <div v-if="gameStore.gameStatus === 'active'" class="active-game">
      <div class="game-info">
        <p>
          Spiel-ID: <span class="game-id">{{ gameStore.gameId }}</span>
        </p>
        <p>
          Partner ist
          <span :class="['status', gameStore.isPartnerOnline ? 'online' : 'offline']">
            {{ gameStore.isPartnerOnline ? 'Online' : 'Offline' }}
          </span>
        </p>
      </div>
      <SudokuBoard />
      <button @click="gameStore.endGame()" class="end-game-btn">Spiel beenden</button>
    </div>

    <div v-if="!authStore.user" class="login-prompt">
      <h2>Bitte einloggen</h2>
      <p>Du musst eingeloggt sein, um ein Spiel zu spielen.</p>
      <router-link to="/login">Zum Login</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import SudokuBoard from '../components/SudokuBoard.vue'

const gameStore = useGameStore()
const authStore = useAuthStore()

onMounted(() => {
  if (authStore.user) {
    gameStore.init()
  }
})
</script>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.loading-spinner {
  font-size: 1.5rem;
  margin: 2rem;
}

.idle-state,
.waiting-state,
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.idle-state button,
.end-game-btn {
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  background-color: #4caf50;
  color: white;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.idle-state button:hover,
.end-game-btn:hover {
  background-color: #45a049;
}

.waiting-for-lobby {
  margin-top: 1rem;
  font-style: italic;
  color: #666;
}

.active-game {
  width: 100%;
  max-width: 600px;
}

.game-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.game-id {
  font-family: monospace;
  font-size: 0.9rem;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}

.status {
  font-weight: bold;
}

.status.online {
  color: #4caf50;
}

.status.offline {
  color: #f44336;
}

.end-game-btn {
  margin-top: 1rem;
  background-color: #f44336;
}

.end-game-btn:hover {
  background-color: #da190b;
}
</style>

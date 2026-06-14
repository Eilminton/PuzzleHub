<template>
  <div class="home-view-container">
    <div v-if="gameStore.isLoading" class="loading-state">
      <p>Spiel wird geladen...</p>
      <!-- Optional: Add a simple spinner here -->
    </div>
    <div v-else-if="gameStore.gameStatus === 'active'">
      <h2>Aktives Spiel</h2>
      <p v-if="gameStore.isPartnerOnline">Deine Freundin ist online!</p>
      <p v-else>Warten auf deine Freundin...</p>
      <SudokuBoard />
      <button @click="gameStore.endGame()" class="end-game-btn">Spiel beenden</button>
    </div>
    <div v-else-if="gameStore.gameStatus === 'waiting'" class="waiting-state">
      <h2>Warten auf deine Freundin...</h2>
      <p>Sobald sie beitritt, startet das Spiel automatisch.</p>
      <button @click="gameStore.endGame()" class="end-game-btn">Warten abbrechen</button>
    </div>
    <div v-else class="start-game-state">
      <h2>Bereit für ein neues Sudoku?</h2>
      <button @click="gameStore.startNewGame()" class="start-new-game-btn">Neues Spiel starten</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import SudokuBoard from '../components/SudokuBoard.vue'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.init()
})
</script>

<style scoped>
.home-view-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px); /* Adjust for header height */
  padding: 2rem;
  box-sizing: border-box;
  text-align: center;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.loading-state,
.waiting-state,
.start-game-state {
  background: white;
  padding: 2.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.loading-state p,
.waiting-state p {
  color: #666;
  font-size: 1.1rem;
  margin-top: 1rem;
}

.start-new-game-btn,
.end-game-btn {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1.5rem;
}

.start-new-game-btn:hover,
.end-game-btn:hover {
  background-color: #3aa876;
}

.end-game-btn {
  background-color: #e74c3c;
  margin-top: 2rem;
}

.end-game-btn:hover {
  background-color: #c0392b;
}
</style>

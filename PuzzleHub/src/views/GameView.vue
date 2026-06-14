<template>
  <div class="game-view-container">
    <div class="game-meta">
      <h3>Spielraum active ⚡</h3>
      <p>Teile diesen Link mit deiner Freundin:</p>
      <div class="share-box">
        <input type="text" :value="shareUrl" readonly class="share-input" />
        <button @click="copyLink" class="copy-btn">📋 Kopieren</button>
      </div>
    </div>

    <SudokuBoard />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSudokuStore } from '../stores/sudoku'
import SudokuBoard from '../components/SudokuBoard.vue'

const route = useRoute()
const store = useSudokuStore()

// Holt die gameId aus der URL (z.B. aus /game/:id)
const gameId = route.params.id

// Erstellt den vollen Link zum Teilen
const shareUrl = computed(() => window.location.href)

onMounted(() => {
  // Speichert die aktuelle Spiel-ID im Pinia Store
  store.gameId = gameId

  // TODO: Hier rufen wir später die Funktion auf, die das Board
  // aus Supabase lädt und die Realtime-Verbindung startet!
})

const copyLink = () => {
  navigator.clipboard.writeText(shareUrl.value)
  alert('Link in die Zwischenablage kopiert! Schick ihn deiner Freundin. 🚀')
}
</script>

<style scoped>
.game-view-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.game-meta {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.game-meta h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.game-meta p {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
}

.share-box {
  display: flex;
  gap: 0.5rem;
}

.share-input {
  width: 250px;
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #555;
}

.copy-btn {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}

.copy-btn:hover {
  background-color: #1a252f;
}
</style>

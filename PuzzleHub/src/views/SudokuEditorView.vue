<template>
  <div class="editor-page">
    <section v-if="gameStore.activePuzzle" class="editor-shell">
      <div class="editor-sidebar">
        <p class="eyebrow">Sudoku editor</p>
        <h2>{{ gameStore.activePuzzle.title }}</h2>
        <p class="lead">
          Schwierigkeit: {{ difficultyLabels[gameStore.activePuzzle.difficulty] }}. Änderungen
          werden live für beide Partner gespeichert.
        </p>

        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">Status</span>
            <span class="info-value">{{
              statusLabel[gameStore.activePuzzle.status] || gameStore.activePuzzle.status
            }}</span>
          </div>
          <div class="info-card">
            <span class="info-label">Fortschritt</span>
            <span class="info-value">{{ progress }}%</span>
          </div>
          <div class="info-card">
            <span class="info-label">Zuletzt geöffnet</span>
            <span class="info-value">{{ formatDate(gameStore.activePuzzle.last_opened_at) }}</span>
          </div>
          <div class="info-card">
            <span class="info-label">Zuletzt gespeichert</span>
            <span class="info-value">{{ formatDate(gameStore.activePuzzle.updated_at) }}</span>
          </div>
        </div>

        <div class="action-row">
          <button class="secondary-btn" @click="closePuzzle">Schliessen</button>
          <button class="danger-btn" @click="removePuzzle">Löschen</button>
        </div>

        <p class="note">
          Wenn ihr die Seite schliesst, bleibt der Fortschritt erhalten und das Puzzle bleibt in
          eurer gemeinsamen Bibliothek.
        </p>
      </div>

      <div class="editor-board">
        <SudokuBoard />
      </div>
    </section>

    <section v-else class="editor-empty">
      <p class="eyebrow">Sudoku editor</p>
      <h2>Sudoku wird geladen</h2>
      <p class="lead">
        {{
          gameStore.errorMessage ||
          'Falls das Puzzle nicht direkt geladen wurde, kehren wir zur Bibliothek zurück.'
        }}
      </p>
      <router-link to="/sudoku" class="primary-btn">Zur Bibliothek</router-link>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import SudokuBoard from '../components/SudokuBoard.vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const route = useRoute()
const router = useRouter()

const difficultyLabels = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
}

const statusLabel = {
  new: 'Neu',
  in_progress: 'In Bearbeitung',
  paused: 'Pausiert',
  finished: 'Fertig',
}

const progress = computed(() => {
  const fixed = gameStore.activePuzzle?.fixed_cells?.length || 0
  const totalPlayable = 81 - fixed
  if (totalPlayable <= 0) {
    return 100
  }

  const filled = gameStore.board.filter(
    (value, index) => !gameStore.fixedCells.includes(index) && value !== 0,
  ).length

  return Math.round((filled / totalPlayable) * 100)
})

onMounted(async () => {
  await gameStore.init()
  await ensurePuzzleLoaded()
})

watch(
  () => route.params.id,
  async () => {
    await ensurePuzzleLoaded()
  },
)

onBeforeRouteLeave(async () => {
  await gameStore.closePuzzle()
})

async function ensurePuzzleLoaded() {
  const puzzleId = route.params.id
  if (!puzzleId) {
    await router.replace({ name: 'sudoku-library' })
    return
  }

  if (gameStore.activePuzzle?.id !== puzzleId) {
    await gameStore.openPuzzle(puzzleId)
  }
}

async function closePuzzle() {
  await gameStore.closePuzzle()
  await router.push({ name: 'sudoku-library' })
}

async function removePuzzle() {
  const puzzleId = gameStore.activePuzzle?.id
  if (!puzzleId) return

  await gameStore.deletePuzzle(puzzleId)
  await router.push({ name: 'sudoku-library' })
}

function formatDate(value) {
  if (!value) return 'Noch nicht gespeichert'

  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<style scoped>
.editor-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem;
}

.editor-shell {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.4fr);
  gap: 1.25rem;
}

.editor-sidebar,
.editor-board,
.editor-empty {
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 16, 31, 0.78);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
}

.editor-sidebar {
  padding: 1.4rem;
}

.eyebrow {
  margin: 0 0 0.45rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.74rem;
}

h2 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  line-height: 1.04;
}

.lead {
  margin: 0.85rem 0 0;
  color: var(--muted);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1.2rem;
}

.info-card {
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.info-label {
  display: block;
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.info-value {
  display: block;
  margin-top: 0.3rem;
  font-weight: 700;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.2rem;
}

.secondary-btn,
.danger-btn,
.primary-btn {
  border-radius: 999px;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.danger-btn {
  background: rgba(239, 91, 91, 0.18);
  color: #ffd4d4;
}

.primary-btn {
  display: inline-flex;
  width: fit-content;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #111827;
  font-weight: 700;
}

.note {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.editor-board {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  min-height: 520px;
}

.editor-empty {
  padding: 2rem;
}

@media (max-width: 940px) {
  .editor-shell {
    grid-template-columns: 1fr;
  }

  .editor-board {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .editor-page {
    padding: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>

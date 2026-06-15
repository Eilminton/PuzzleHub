<template>
  <div class="library-page">
    <section class="library-header">
      <div>
        <p class="eyebrow">Sudoku library</p>
        <h2>Gemeinsame Sudoku-Bibliothek</h2>
        <p class="lead">
          Neue Rätsel erstellen, alte später fortsetzen und jederzeit denselben Stand für beide
          Partner sehen.
        </p>
      </div>

      <div class="library-actions">
        <button
          v-for="difficulty in difficulties"
          :key="difficulty"
          class="create-btn"
          :class="difficulty"
          @click="createPuzzle(difficulty)"
        >
          Neues {{ difficultyLabels[difficulty] }}
        </button>
      </div>
    </section>

    <section class="tab-row" aria-label="Schwierigkeiten">
      <button
        v-for="difficulty in difficulties"
        :key="difficulty"
        class="tab-btn"
        :class="{ active: activeTab === difficulty }"
        @click="activeTab = difficulty"
      >
        {{ difficultyLabels[difficulty] }}
        <span class="count">{{ puzzlesByDifficulty[difficulty].length }}</span>
      </button>
    </section>

    <section v-if="isLoading" class="state-panel">
      <p>Sudokus werden geladen...</p>
    </section>

    <section v-if="actionError" class="state-panel error">
      <p>{{ actionError }}</p>
    </section>

    <section v-else-if="gameStore.errorMessage" class="state-panel error">
      <p>{{ gameStore.errorMessage }}</p>
    </section>

    <section v-else-if="visiblePuzzles.length === 0" class="state-panel empty">
      <h3>Noch keine Sudokus in dieser Schwierigkeit</h3>
      <p>Erstelle das erste Sudoku und arbeite es gemeinsam mit deinem Partner weiter.</p>
    </section>

    <section v-else class="puzzle-grid">
      <article v-for="puzzle in visiblePuzzles" :key="puzzle.id" class="puzzle-card">
        <div class="puzzle-card__top">
          <div>
            <p class="puzzle-title">{{ puzzle.title || 'Sudoku' }}</p>
            <p class="puzzle-meta">
              Zuletzt bearbeitet:
              {{ formatDate(puzzle.updated_at) }}
            </p>
          </div>
          <span class="status-pill" :class="puzzle.status">{{ statusLabel[puzzle.status] || puzzle.status }}</span>
        </div>

        <div class="progress-line">
          <span :style="{ width: getProgress(puzzle) + '%' }"></span>
        </div>

        <p class="puzzle-meta">
          Schwierigkeit: <strong>{{ difficultyLabels[puzzle.difficulty] }}</strong>
        </p>

        <div class="card-actions">
          <button class="ghost-btn" @click="goToPuzzle(puzzle.id)">Öffnen</button>
          <button class="danger-btn" @click="removePuzzle(puzzle.id)">Löschen</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const router = useRouter()
const activeTab = ref('easy')
const actionError = ref('')

const difficulties = ['easy', 'medium', 'hard']
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

onMounted(() => {
  gameStore.init()
})

const puzzlesByDifficulty = computed(() => gameStore.puzzlesByDifficulty)

const visiblePuzzles = computed(() => puzzlesByDifficulty.value[activeTab.value] || [])

const isLoading = computed(() => gameStore.isLoading)

async function createPuzzle(difficulty) {
  actionError.value = ''
  try {
    const puzzle = await gameStore.startNewGame(difficulty)
    await router.push({ name: 'sudoku-editor', params: { id: puzzle.id } })
  } catch (error) {
    actionError.value = error?.message || 'Sudoku konnte nicht erstellt werden.'
  }
}

async function goToPuzzle(puzzleId) {
  actionError.value = ''
  try {
    await gameStore.openPuzzle(puzzleId)
    await router.push({ name: 'sudoku-editor', params: { id: puzzleId } })
  } catch (error) {
    actionError.value = error?.message || 'Sudoku konnte nicht geöffnet werden.'
  }
}

async function removePuzzle(puzzleId) {
  actionError.value = ''
  try {
    await gameStore.deletePuzzle(puzzleId)
  } catch (error) {
    actionError.value = error?.message || 'Sudoku konnte nicht gelöscht werden.'
  }
}

function getProgress(puzzle) {
  const filled = puzzle.board.filter((value, index) => !puzzle.fixed_cells.includes(index) && value !== 0)
    .length
  const total = 81 - puzzle.fixed_cells.length
  if (total <= 0) return 100
  return Math.round((filled / total) * 100)
}

function formatDate(value) {
  if (!value) return 'Gerade eben'

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
.library-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem;
}

.library-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.5rem;
  border-radius: 28px;
  background: rgba(9, 16, 31, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: var(--accent);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.74rem;
}

h2 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.lead {
  margin: 0.8rem 0 0;
  max-width: 58ch;
  color: var(--muted);
}

.library-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
}

.create-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1rem;
  color: #0d1523;
  font-weight: 700;
  cursor: pointer;
}

.create-btn.easy {
  background: #d7fba8;
}

.create-btn.medium {
  background: #ffd58a;
}

.create-btn.hard {
  background: #f8a7a7;
}

.tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 999px;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  cursor: pointer;
}

.tab-btn.active {
  color: var(--text);
  background: rgba(242, 193, 78, 0.14);
  border-color: rgba(242, 193, 78, 0.35);
}

.count {
  display: inline-flex;
  min-width: 1.45rem;
  justify-content: center;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.state-panel {
  margin-top: 1.25rem;
  padding: 1.4rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.state-panel.error {
  border-color: rgba(239, 91, 91, 0.3);
  background: rgba(239, 91, 91, 0.12);
}

.state-panel.empty h3 {
  margin: 0 0 0.4rem;
}

.puzzle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.puzzle-card {
  padding: 1.2rem;
  border-radius: 24px;
  background: rgba(8, 13, 24, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.puzzle-card__top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.puzzle-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.puzzle-meta {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.94rem;
}

.status-pill {
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.status-pill.new {
  background: rgba(242, 193, 78, 0.18);
  color: #ffe6a6;
}

.status-pill.in_progress {
  background: rgba(93, 211, 158, 0.16);
  color: #b4f3d6;
}

.status-pill.paused {
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.status-pill.finished {
  background: rgba(242, 193, 78, 0.22);
  color: #ffe6a6;
}

.progress-line {
  margin: 1rem 0;
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.ghost-btn,
.danger-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.72rem 0.95rem;
  cursor: pointer;
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.danger-btn {
  background: rgba(239, 91, 91, 0.18);
  color: #ffd4d4;
}

@media (max-width: 860px) {
  .library-header,
  .puzzle-grid {
    grid-template-columns: 1fr;
  }

  .library-header {
    flex-direction: column;
  }

  .library-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .library-page {
    padding: 1rem;
  }
}
</style>

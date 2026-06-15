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
            <span class="info-label">Tipps</span>
            <span class="info-value">{{ gameStore.hintsRemaining }}</span>
          </div>
          <div class="info-card">
            <span class="info-label">Zuletzt gespeichert</span>
            <span class="info-value">{{ formatDate(gameStore.activePuzzle.updated_at) }}</span>
          </div>
        </div>

        <div class="mode-switch">
          <div class="mode-switch__rail">
            <button
              class="mode-btn"
              :class="{ active: editMode === 'value' }"
              @click="editMode = 'value'"
            >
              <span class="mode-btn__label">Zahl</span>
            </button>
            <button
              class="mode-btn"
              :class="{ active: editMode === 'notes' }"
              @click="editMode = 'notes'"
            >
              <span class="mode-btn__label">Notizen</span>
            </button>
          </div>
          <p class="mode-hint">Tastatur: <kbd>N</kbd> für Notizen, <kbd>V</kbd> für Zahlen</p>
        </div>

        <div class="action-row">
          <button class="secondary-btn" @click="closePuzzle">Schliessen</button>
          <button class="hint-btn" @click="handleHint" :disabled="gameStore.hintsRemaining <= 0">
            Tipp geben
          </button>
          <button class="danger-btn" @click="removePuzzle">Löschen</button>
        </div>

        <p class="note">
          Wähle erst ein Feld, dann eine Zahl. Im Notizenmodus werden kleine Kandidaten unten links
          in der Zelle ein- und ausgeblendet.
        </p>
      </div>

      <div class="editor-board">
        <div class="board-hud">
          <div>
            <span class="board-hud__label">Aktiv</span>
            <strong v-if="Number.isInteger(selectedCell)">Feld {{ selectedCell + 1 }}</strong>
            <strong v-else>Kein Feld gewählt</strong>
          </div>
          <div>
            <span class="board-hud__label">Modus</span>
            <strong>{{ editMode === 'notes' ? 'Notizen' : 'Zahl' }}</strong>
          </div>
        </div>

        <SudokuBoard :selectedIndex="selectedCell" @select-cell="selectedCell = $event" />

        <div class="keypad-panel">
          <button
            v-for="digit in digits"
            :key="digit"
            class="keypad-btn"
            @click="handleDigit(digit)"
          >
            {{ digit }}
          </button>
          <button class="keypad-btn clear" @click="handleClear">Löschen</button>
        </div>

        <p v-if="actionError" class="inline-error">{{ actionError }}</p>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const selectedCell = ref(null)
const editMode = ref('value')
const actionError = ref('')

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
  window.addEventListener('keydown', handleKeyboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard)
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

function requireSelection() {
  if (!Number.isInteger(selectedCell.value)) {
    actionError.value = 'Bitte zuerst ein Feld auswählen.'
    return false
  }

  return true
}

async function handleDigit(digit) {
  actionError.value = ''
  if (!requireSelection()) {
    return
  }

  try {
    if (editMode.value === 'notes') {
      await gameStore.toggleCandidate(selectedCell.value, digit)
      return
    }

    await gameStore.updateCell(selectedCell.value, digit)
  } catch (error) {
    actionError.value = error?.message || 'Eingabe konnte nicht gespeichert werden.'
  }
}

async function handleClear() {
  actionError.value = ''
  if (!requireSelection()) {
    return
  }

  try {
    await gameStore.clearCell(selectedCell.value)
  } catch (error) {
    actionError.value = error?.message || 'Zelle konnte nicht gelöscht werden.'
  }
}

async function handleHint() {
  actionError.value = ''
  try {
    await gameStore.useHint(selectedCell.value)
  } catch (error) {
    actionError.value = error?.message || 'Tipp konnte nicht angewendet werden.'
  }
}

function handleKeyboard(event) {
  if (!gameStore.activePuzzle) {
    return
  }

  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault()
    handleDigit(Number(event.key))
    return
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    handleClear()
    return
  }

  if (event.key.toLowerCase() === 'n') {
    editMode.value = 'notes'
    return
  }

  if (event.key.toLowerCase() === 'v') {
    editMode.value = 'value'
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

.mode-switch {
  display: grid;
  gap: 0.65rem;
  margin-top: 1rem;
}

.mode-switch__rail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  padding: 0.4rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 0.9rem 1rem;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.mode-btn.active {
  background: linear-gradient(135deg, rgba(242, 193, 78, 0.22), rgba(240, 138, 36, 0.15));
  border-color: rgba(242, 193, 78, 0.4);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  transform: translateY(-1px);
}

.mode-btn__label {
  font-size: 0.98rem;
  font-weight: 700;
}

.mode-btn__meta {
  color: var(--muted);
  font-size: 0.78rem;
}

.mode-hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.mode-hint kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.4rem;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 0.78rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.2rem;
}

.secondary-btn,
.danger-btn,
.hint-btn,
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

.hint-btn {
  background: rgba(93, 211, 158, 0.16);
  color: #d7fff0;
}

.hint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  min-height: 520px;
}

.board-hud {
  width: min(520px, 100%);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.board-hud__label {
  display: block;
  margin-bottom: 0.12rem;
  color: var(--muted);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.keypad-panel {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
  width: min(520px, 100%);
}

.keypad-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0.95rem 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
}

.keypad-btn.clear {
  grid-column: span 2;
}

.inline-error {
  margin: 0.85rem 0 0;
  color: #ffd4d4;
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

  .mode-switch__rail {
    grid-template-columns: 1fr;
  }

  .keypad-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .keypad-btn.clear {
    grid-column: span 3;
  }

  .board-hud {
    flex-direction: column;
  }
}
</style>

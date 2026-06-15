<template>
  <div class="hub-page">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Shared game space</p>
        <h2>Wählt ein Spiel, dann spielt ihr gemeinsam weiter.</h2>
        <p class="lead">
          Jeder Eintrag gehört eurer gemeinsamen Puzzle-Bibliothek. Von hier aus springt ihr in
          Sudoku oder in zukünftige Spiele.
        </p>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-value">{{ totalSudokus }}</span>
          <span class="stat-label">Sudokus insgesamt</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ openSudokus }}</span>
          <span class="stat-label">Noch offen</span>
        </div>
      </div>
    </section>

    <section class="game-grid">
      <article class="game-card featured">
        <div class="game-chip">Aktiv</div>
        <h3>Sudoku</h3>
        <p>Gemeinsame Bibliothek mit Tabs nach Schwierigkeit, Realtime und speicherbarem Fortschritt.</p>
        <router-link to="/sudoku" class="card-action">Sudoku öffnen</router-link>
      </article>

      <article class="game-card disabled">
        <div class="game-chip muted">Coming soon</div>
        <h3>Weitere Spiele</h3>
        <p>Die Hub-Struktur ist schon vorbereitet, damit später weitere Puzzle- oder Mini-Games dazukommen können.</p>
      </article>
    </section>

    <section v-if="gameStore.errorMessage" class="error-banner">
      <p>{{ gameStore.errorMessage }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.init()
})

const totalSudokus = computed(() => gameStore.puzzles.length)
const openSudokus = computed(
  () => gameStore.puzzles.filter((puzzle) => puzzle.status !== 'finished').length
)
</script>

<style scoped>
.hub-page {
  padding: 2rem;
  max-width: 1180px;
  margin: 0 auto;
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(18, 28, 48, 0.9), rgba(8, 14, 24, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.74rem;
}

h2 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.6rem);
  line-height: 1.02;
  max-width: 12ch;
}

.lead {
  margin: 1rem 0 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: 1.05rem;
}

.hero-stats {
  display: grid;
  gap: 0.9rem;
  align-content: start;
}

.stat-card {
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.stat-label {
  color: var(--muted);
  font-size: 0.95rem;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.error-banner {
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  background: rgba(239, 91, 91, 0.12);
  border: 1px solid rgba(239, 91, 91, 0.24);
  color: #ffd4d4;
}

.game-card {
  min-height: 220px;
  padding: 1.4rem;
  border-radius: 24px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.game-card h3 {
  margin: 0;
  font-size: 1.35rem;
}

.game-card p {
  margin: 0;
  color: var(--muted);
}

.featured {
  background:
    radial-gradient(circle at top right, rgba(242, 193, 78, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(22, 33, 53, 0.95), rgba(11, 17, 28, 0.95));
}

.game-chip {
  display: inline-flex;
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1f2a09;
  background: var(--accent);
}

.game-chip.muted {
  color: var(--muted);
  background: rgba(255, 255, 255, 0.08);
}

.card-action {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0.82rem 1.2rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #111827;
  font-weight: 700;
}

.disabled {
  opacity: 0.9;
}

@media (max-width: 860px) {
  .hero-panel,
  .game-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hub-page {
    padding: 1rem;
  }
}
</style>

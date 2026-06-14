<template>
  <div class="home-container">
    <h2>Bereit für ein Match? 🧠</h2>
    <p>
      Erstelle ein neues Spiel und teile den Link mit deiner Freundin, um in Echtzeit
      zusammenzuspielen.
    </p>
    <button @click="startNewGame" class="start-btn">🎮 Neues Spiel starten</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const startNewGame = () => {
  // Für den Übergang generieren wir eine zufällige ID (z.B. per Krypto-API des Browsers)
  // Später wird hier stattdessen das Spiel in Supabase erstellt!
  const randomGameId = crypto.randomUUID()

  // Weiterleitung zu /game/DEINE-NEUE-ID
  router.push(`/game/${randomGameId}`)
}
</script>

<style scoped>
.home-container {
  text-align: center;
  max-width: 400px;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  color: #2c3e50;
}

p {
  color: #666;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.start-btn {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.start-btn:hover {
  background-color: #3aa876;
}
</style>

<template>
  <header class="app-header">
    <h1>🧩 Multiplayer Sudoku</h1>
    <nav>
      <RouterLink to="/">Startseite</RouterLink>
    </nav>
  </header>

  <main class="app-content">
    <RouterView />
  </main>
</template>

<style>
/* Globale Basis-Styles für die App */
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  color: #333;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
}

.app-header nav a {
  color: #42b983;
  text-decoration: none;
  font-weight: bold;
}

.app-header nav a:hover {
  text-decoration: underline;
}

.app-content {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

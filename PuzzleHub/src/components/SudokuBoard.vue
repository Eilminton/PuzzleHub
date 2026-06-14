<template>
  <div class="sudoku-container">
    <div class="sudoku-board">
      <div v-for="(row, rowIndex) in store.board" :key="rowIndex" class="sudoku-row">
        <input
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          type="number"
          min="1"
          max="9"
          :value="cell.value"
          :disabled="cell.isOriginal"
          class="sudoku-cell"
          @input="handleInput(rowIndex, colIndex, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSudokuStore } from '../stores/sudoku'

const store = useSudokuStore()

const handleInput = (row, col, event) => {
  const val = event.target.value
  const num = val ? parseInt(val) : null

  // Nur Zahlen von 1-9 zulassen
  if (num === null || (num >= 1 && num <= 9)) {
    store.updateCell(row, col, num)
  } else {
    event.target.value = '' // Ungültige Eingabe zurücksetzen
  }
}
</script>

<style scoped>
.sudoku-board {
  display: flex;
  flex-direction: column;
  border: 3px solid #333;
  width: max-content;
  margin: 0 auto;
}
.sudoku-row {
  display: flex;
}
.sudoku-cell {
  width: 40px;
  height: 40px;
  text-align: center;
  font-size: 1.2rem;
  border: 1px solid #ccc;
}
/* Deaktivierte Felder (Vorgaben) grau färben */
.sudoku-cell:disabled {
  background-color: #f0f0f0;
  font-weight: bold;
}
/* Optional: Hier kann man später noch die dicken 3x3 Block-Ränder hinzufügen */
</style>

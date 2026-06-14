<template>
  <div class="sudoku-board">
    <div
      v-for="(row, rowIndex) in gameStore.board"
      :key="rowIndex"
      class="sudoku-row"
      :class="{ 'border-bottom': (rowIndex + 1) % 3 === 0 && rowIndex !== 9 }"
    >
      <SudokuCell
        v-for="(cell, colIndex) in row"
        :key="`${rowIndex}-${colIndex}`"
        :row="rowIndex"
        :col="colIndex"
        :modelValue="cell.value"
        :isFixed="cell.isOriginal"
        @update:modelValue="handleCellUpdate"
        :class="{ 'border-right': (colIndex + 1) % 3 === 0 && colIndex !== 9 }"
      />
    </div>
  </div>
</template>

<script setup>
import SudokuCell from './SudokuCell.vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

const handleCellUpdate = ({ row, col, value }) => {
  gameStore.updateCell(row, col, value)
}
</script>

<style scoped>
.sudoku-board {
  display: grid;
  grid-template-rows: repeat(9, 1fr);
  border: 2px solid #333;
  width: min(90vw, 500px); /* Max width and responsive */
  height: min(90vw, 500px);
  aspect-ratio: 1 / 1; /* Keep square aspect ratio */
  margin: 1.5rem auto;
}

.sudoku-row {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
}

/* Thicker lines for 3x3 blocks */
.sudoku-row .border-right {
  border-right: 2px solid #333;
}

.border-bottom {
  border-bottom: 2px solid #333;
}
</style>

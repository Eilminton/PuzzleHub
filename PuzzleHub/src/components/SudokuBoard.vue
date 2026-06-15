<template>
  <div class="sudoku-board">
    <div
      v-for="(row, rowIndex) in structuredBoard"
      :key="rowIndex"
      class="sudoku-row"
      :class="{ 'border-bottom': (rowIndex + 1) % 3 === 0 && rowIndex < 8 }"
    >
      <SudokuCell
        v-for="(cell, colIndex) in row"
        :key="`${rowIndex}-${colIndex}`"
        :row="rowIndex"
        :col="colIndex"
        :modelValue="cell.value"
        :isFixed="cell.isOriginal"
        @update:modelValue="handleCellUpdate"
        :class="{ 'border-right': (colIndex + 1) % 3 === 0 && colIndex < 8 }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SudokuCell from './SudokuCell.vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()

const structuredBoard = computed(() => {
  const board = []
  for (let i = 0; i < 9; i++) {
    const row = []
    for (let j = 0; j < 9; j++) {
      const index = i * 9 + j
      row.push({
        value: gameStore.board[index] === 0 ? null : gameStore.board[index],
        isOriginal: gameStore.fixedCells.includes(index),
      })
    }
    board.push(row)
  }
  return board
})

const handleCellUpdate = ({ row, col, value }) => {
  const index = row * 9 + col
  // The value from the input is a string, so we need to parse it
  const parsedValue = value === null ? 0 : parseInt(value, 10)
  gameStore.updateCell(index, parsedValue)
}
</script>

<style scoped>
.sudoku-board {
  display: grid;
  grid-template-rows: repeat(9, 1fr);
  border: 2px solid rgba(255, 255, 255, 0.12);
  width: min(90vw, 520px);
  height: min(90vw, 500px);
  aspect-ratio: 1 / 1;
  margin: 1.5rem auto;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 18px;
  overflow: hidden;
}

.sudoku-row {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
}

/* Thicker lines for 3x3 blocks */
.sudoku-row .border-right {
  border-right: 2px solid rgba(255, 255, 255, 0.18);
}

.border-bottom {
  border-bottom: 2px solid rgba(255, 255, 255, 0.18);
}
</style>

<template>
  <div class="sudoku-board">
    <div
      v-for="(row, rowIndex) in structuredBoard"
      :key="rowIndex"
      class="sudoku-row"
      :class="{ 'border-bottom': (rowIndex + 1) % 3 === 0 && rowIndex < 8 }"
    >
      <SudokuCell
        v-for="cell in row"
        :key="cell.index"
        :value="cell.value"
        :notes="cell.notes"
        :isFixed="cell.isOriginal"
        :isSelected="selectedIndex === cell.index"
        :isRelated="isRelatedCell(cell.index)"
        @select="handleSelect(cell.index)"
        :class="{ 'border-right': (cell.col + 1) % 3 === 0 && cell.col < 8 }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SudokuCell from './SudokuCell.vue'
import { useGameStore } from '../stores/game'

const props = defineProps({
  selectedIndex: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['select-cell'])

const gameStore = useGameStore()

const structuredBoard = computed(() => {
  const board = []
  for (let i = 0; i < 9; i++) {
    const row = []
    for (let j = 0; j < 9; j++) {
      const index = i * 9 + j
      row.push({
        index,
        col: j,
        value: gameStore.board[index] === 0 ? null : gameStore.board[index],
        notes: gameStore.candidateNotes[index] || [],
        isOriginal: gameStore.fixedCells.includes(index),
      })
    }
    board.push(row)
  }
  return board
})

function handleSelect(index) {
  emit('select-cell', index)
}

function isRelatedCell(index) {
  if (!Number.isInteger(props.selectedIndex)) {
    return false
  }

  if (props.selectedIndex === index) {
    return true
  }

  const selectedRow = Math.floor(props.selectedIndex / 9)
  const selectedCol = props.selectedIndex % 9
  const row = Math.floor(index / 9)
  const col = index % 9

  const sameRow = row === selectedRow
  const sameCol = col === selectedCol
  const sameBlock =
    Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
    Math.floor(col / 3) === Math.floor(selectedCol / 3)

  return sameRow || sameCol || sameBlock
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

.sudoku-row :deep(.border-right) {
  border-right: 2px solid rgba(255, 255, 255, 0.18);
}

.border-bottom {
  border-bottom: 2px solid rgba(255, 255, 255, 0.18);
}
</style>

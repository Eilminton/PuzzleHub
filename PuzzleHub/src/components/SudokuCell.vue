<template>
  <div class="sudoku-cell" :class="{ 'is-fixed': isFixed }">
    <input
      type="number"
      min="1"
      max="9"
      :value="modelValue"
      @input="handleInput"
      :disabled="isFixed"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: [Number, null],
  row: Number,
  col: Number,
  isFixed: Boolean, // Renamed from isOriginal to isFixed for clarity
})

const emit = defineEmits(['update:modelValue'])

const handleInput = (event) => {
  let value = parseInt(event.target.value)
  if (isNaN(value) || value < 1 || value > 9) {
    value = null // Only allow valid numbers from 1-9
  }
  emit('update:modelValue', { row: props.row, col: props.col, value })
}
</script>

<style scoped>
.sudoku-cell {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #ddd;
  box-sizing: border-box; /* Ensures padding and border are included in the width */
}

.sudoku-cell input {
  width: 90%;
  height: 90%;
  text-align: center;
  font-size: 1.5em;
  border: none;
  background-color: transparent;
  outline: none;
}

.sudoku-cell.is-fixed input {
  font-weight: bold;
  background-color: #e0e0e0;
  cursor: not-allowed;
  color: #333;
}
</style>

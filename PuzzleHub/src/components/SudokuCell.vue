<template>
  <button
    type="button"
    class="sudoku-cell"
    :class="{
      'is-fixed': isFixed,
      'is-selected': isSelected,
      'is-related': isRelated,
      'has-notes': hasNotes,
      'is-filled': hasValue,
    }"
    @click="$emit('select')"
  >
    <span v-if="hasValue" class="cell-value">{{ value }}</span>

    <span v-else-if="hasNotes" class="candidate-grid" aria-hidden="true">
      <span v-for="digit in 9" :key="digit" class="candidate-slot">
        {{ notes.includes(digit) ? digit : '' }}
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  notes: {
    type: Array,
    default: () => [],
  },
  isFixed: Boolean,
  isSelected: Boolean,
  isRelated: Boolean,
})

defineEmits(['select'])

const hasValue = computed(() => Number(props.value) > 0)
const hasNotes = computed(() => Array.isArray(props.notes) && props.notes.length > 0 && !hasValue.value)
</script>

<style scoped>
.sudoku-cell {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  cursor: pointer;
  outline: none;
}

.sudoku-cell:hover {
  background: rgba(255, 255, 255, 0.05);
}

.sudoku-cell.is-related {
  background: rgba(242, 193, 78, 0.04);
}

.sudoku-cell.is-selected {
  box-shadow:
    inset 0 0 0 2px rgba(242, 193, 78, 0.95),
    0 0 0 3px rgba(242, 193, 78, 0.18),
    0 10px 22px rgba(0, 0, 0, 0.22);
  background:
    radial-gradient(circle at center, rgba(242, 193, 78, 0.18), rgba(242, 193, 78, 0.08) 55%, transparent 100%),
    rgba(242, 193, 78, 0.08);
  z-index: 2;
}

.sudoku-cell.is-fixed {
  cursor: default;
}

.sudoku-cell.is-fixed .cell-value {
  color: var(--accent);
}

.cell-value {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  font-weight: 700;
  line-height: 1;
}

.candidate-grid {
  position: absolute;
  left: 7%;
  bottom: 6%;
  width: 58%;
  height: 58%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.06rem;
  align-items: end;
  justify-items: start;
  pointer-events: none;
}

.candidate-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 0.62rem;
  line-height: 1;
  color: rgba(238, 242, 255, 0.72);
}

.has-notes .candidate-slot {
  color: rgba(238, 242, 255, 0.8);
}
</style>

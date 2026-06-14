import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSudokuStore = defineStore('sudoku', () => {
  const gameId = ref(null)
  // Ein leeres 9x9 Gitter für den Anfang erzeugen
  const board = ref(
    Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => ({
        value: null,
        isOriginal: false,
      })),
    ),
  )

  // Funktion, um eine Zahl einzutragen (wird später an Supabase gesendet)
  function updateCell(row, col, value) {
    board.value[row][col].value = value

    // TODO: Hier kommt später das Supabase UPDATE rein!
    console.log(`Zelle [${row}, ${col}] geändert auf: ${value}`)
  }

  return { gameId, board, updateCell }
})

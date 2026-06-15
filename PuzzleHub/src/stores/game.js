import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from './auth'

const DIFFICULTIES = ['easy', 'medium', 'hard']

function createEmptyBoard() {
  return Array(81).fill(0)
}

function normalizeBoard(board) {
  if (!Array.isArray(board) || board.length !== 81) {
    return createEmptyBoard()
  }

  return board.map((value) => Number(value) || 0)
}

function normalizeCells(cells) {
  if (!Array.isArray(cells)) {
    return []
  }

  return cells
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value < 81)
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false
  }

  return a.every((value, index) => Number(value) === Number(b[index]))
}

function getFixedCells(board) {
  return board.reduce((cells, value, index) => {
    if (Number(value) !== 0) {
      cells.push(index)
    }

    return cells
  }, [])
}

function derivePuzzleStatus(board, initialBoard, solution, forcePaused = false) {
  const normalizedBoard = normalizeBoard(board)
  const normalizedInitialBoard = normalizeBoard(initialBoard)
  const normalizedSolution = normalizeBoard(solution)

  if (arraysEqual(normalizedBoard, normalizedSolution)) {
    return 'finished'
  }

  if (forcePaused) {
    return 'paused'
  }

  if (arraysEqual(normalizedBoard, normalizedInitialBoard)) {
    return 'new'
  }

  return 'in_progress'
}

function normalizePuzzleRow(row) {
  if (!row) return null

  return {
    ...row,
    status: row.status || row.session_status || 'new',
    difficulty: row.difficulty || 'easy',
    board: normalizeBoard(row.board),
    initial_board: normalizeBoard(row.initial_board),
    solution: normalizeBoard(row.solution),
    fixed_cells: normalizeCells(row.fixed_cells),
  }
}

function getDifficultyOrder(difficulty) {
  return DIFFICULTIES.includes(difficulty) ? difficulty : 'easy'
}

function buildPuzzleTitle(difficulty) {
  const labels = {
    easy: 'Leicht',
    medium: 'Mittel',
    hard: 'Schwer',
  }

  const today = new Date()
  const stamp = today.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return `Sudoku ${labels[getDifficultyOrder(difficulty)]} ${stamp}`
}

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()

  const coupleId = ref(null)
  const coupleMember = ref(null)
  const puzzles = ref([])
  const activePuzzle = ref(null)
  const board = ref(createEmptyBoard())
  const fixedCells = ref([])
  const solution = ref(createEmptyBoard())
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const errorMessage = ref('')
  const libraryChannel = ref(null)
  const activePuzzleChannel = ref(null)

  const gameId = computed(() => activePuzzle.value?.id || null)
  const gameStatus = computed(() => (activePuzzle.value ? 'active' : 'idle'))
  const selectedDifficulty = computed(() => activePuzzle.value?.difficulty || null)
  const isActivePuzzleFinished = computed(
    () => activePuzzle.value?.status === 'finished' || arraysEqual(board.value, solution.value)
  )

  const puzzlesByDifficulty = computed(() => {
    return DIFFICULTIES.reduce((groups, difficulty) => {
      groups[difficulty] = puzzles.value.filter(
        (puzzle) => getDifficultyOrder(puzzle.difficulty) === difficulty
      )
      return groups
    }, {})
  })

  async function init() {
    if (!authStore.user) {
      resetRuntimeState()
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      await ensureCoupleScope()
      await refreshLibrary()
      subscribeToLibrary()
      isInitialized.value = true
    } catch (error) {
      errorMessage.value = error?.message || 'Bibliothek konnte nicht geladen werden.'
      console.error('[GameStore] init error:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function ensureCoupleScope() {
    if (!authStore.user) {
      throw new Error('Du musst eingeloggt sein.')
    }

    if (coupleId.value) {
      return coupleId.value
    }

    const { data, error } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', authStore.user.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data?.couple_id) {
      throw new Error('Kein gemeinsamer Couple-Kontext gefunden.')
    }

    coupleMember.value = data
    coupleId.value = data.couple_id
    return coupleId.value
  }

  async function refreshLibrary() {
    const scopeId = await ensureCoupleScope()

    const { data, error } = await supabase
      .from('sudoku_sessions')
      .select('*')
      .eq('couple_id', scopeId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    puzzles.value = (data || []).map(normalizePuzzleRow).filter(Boolean)
  }

  function subscribeToLibrary() {
    if (libraryChannel.value) {
      return
    }

    if (!coupleId.value) {
      return
    }

    libraryChannel.value = supabase
      .channel(`couple-sudoku-library:${coupleId.value}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sudoku_sessions',
          filter: `couple_id=eq.${coupleId.value}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!payload.new?.deleted_at) {
              upsertPuzzle(normalizePuzzleRow(payload.new))
            }
            return
          }

          if (payload.eventType === 'UPDATE') {
            const nextPuzzle = normalizePuzzleRow(payload.new)
          if (nextPuzzle?.deleted_at) {
            removePuzzle(nextPuzzle.id)
            if (activePuzzle.value?.id === nextPuzzle.id) {
              clearActivePuzzle(true)
            }
            return
          }

            upsertPuzzle(nextPuzzle)
            if (activePuzzle.value?.id === nextPuzzle?.id) {
              syncActivePuzzle(nextPuzzle)
            }
            return
          }

          if (payload.eventType === 'DELETE') {
            removePuzzle(payload.old?.id)
            if (activePuzzle.value?.id === payload.old?.id) {
              clearActivePuzzle(true)
            }
          }
        }
      )
      .subscribe()
  }

  function upsertPuzzle(nextPuzzle) {
    if (!nextPuzzle) return

    const index = puzzles.value.findIndex((entry) => entry.id === nextPuzzle.id)
    if (index === -1) {
      puzzles.value = [nextPuzzle, ...puzzles.value].sort(sortByUpdatedAtDesc)
      return
    }

    const next = [...puzzles.value]
    next[index] = nextPuzzle
    puzzles.value = next.sort(sortByUpdatedAtDesc)
  }

  function removePuzzle(puzzleId) {
    puzzles.value = puzzles.value.filter((puzzle) => puzzle.id !== puzzleId)
  }

  function sortByUpdatedAtDesc(a, b) {
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  }

  async function startNewGame(difficulty = 'easy') {
    if (!authStore.user) {
      throw new Error('Du musst eingeloggt sein.')
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      const scopeId = await ensureCoupleScope()
      const puzzleResponse = await fetchSudokuFromAPI(difficulty)

      const initialBoard = puzzleResponse.puzzle.split('').map(Number)
      const solutionBoard = puzzleResponse.solution.split('').map(Number)
      const fixed = getFixedCells(initialBoard)
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('sudoku_sessions')
        .insert({
          host_id: authStore.user.id,
          partner_id: null,
          couple_id: scopeId,
          title: buildPuzzleTitle(difficulty),
          difficulty: getDifficultyOrder(difficulty),
          board: initialBoard,
          initial_board: initialBoard,
          fixed_cells: fixed,
          solution: solutionBoard,
          status: 'new',
          deleted_at: null,
          last_opened_at: now,
          updated_at: now,
          last_edited_by: authStore.user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      const normalized = normalizePuzzleRow(data)
      upsertPuzzle(normalized)
      await openPuzzle(normalized.id, { skipRefresh: true })
      return normalized
    } catch (error) {
      errorMessage.value = error?.message || 'Neues Sudoku konnte nicht erstellt werden.'
      console.error('[GameStore] startNewGame error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function openPuzzle(puzzleId, options = {}) {
    const { skipRefresh = false } = options

    if (!authStore.user) {
      throw new Error('Du musst eingeloggt sein.')
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      await ensureCoupleScope()

      let puzzle = puzzles.value.find((entry) => entry.id === puzzleId)

      if (!puzzle || !skipRefresh) {
        const { data, error } = await supabase
          .from('sudoku_sessions')
          .select('*')
          .eq('id', puzzleId)
          .eq('couple_id', coupleId.value)
          .maybeSingle()

        if (error) {
          throw error
        }

        puzzle = normalizePuzzleRow(data)
      }

      if (!puzzle) {
        throw new Error('Sudoku konnte nicht gefunden werden.')
      }

      syncActivePuzzle(puzzle)
      await supabase
        .from('sudoku_sessions')
        .update({
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', puzzleId)

      subscribeToActivePuzzle(puzzleId)
      return puzzle
    } catch (error) {
      errorMessage.value = error?.message || 'Sudoku konnte nicht geöffnet werden.'
      console.error('[GameStore] openPuzzle error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function updateCell(index, value) {
    if (!activePuzzle.value) {
      return
    }

    if (fixedCells.value.includes(index)) {
      return
    }

    const nextBoard = [...board.value]
    nextBoard[index] = Number(value) || 0
    await persistActivePuzzle(nextBoard)
  }

  async function persistActivePuzzle(nextBoard, forcePaused = false) {
    if (!activePuzzle.value || !gameId.value) {
      return
    }

    const nextStatus = derivePuzzleStatus(
      nextBoard,
      activePuzzle.value.initial_board,
      solution.value,
      forcePaused
    )
    const now = new Date().toISOString()
    const nextPayload = {
      board: nextBoard,
      status: nextStatus,
      updated_at: now,
      last_opened_at: now,
      last_edited_by: authStore.user?.id || null,
    }

    board.value = normalizeBoard(nextBoard)
    activePuzzle.value = {
      ...activePuzzle.value,
      ...nextPayload,
    }

    const { error } = await supabase.from('sudoku_sessions').update(nextPayload).eq('id', gameId.value)
    if (error) {
      errorMessage.value = error.message
      throw error
    }
  }

  async function closePuzzle() {
    if (!activePuzzle.value) {
      return
    }

    const shouldPause = !isActivePuzzleFinished.value
    const nextBoard = [...board.value]

    try {
      if (shouldPause) {
        await persistActivePuzzle(nextBoard, true)
      }
    } finally {
      clearActivePuzzle(true)
    }
  }

  async function deletePuzzle(puzzleId) {
    if (!puzzleId) {
      return
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('sudoku_sessions')
      .update({
        deleted_at: now,
        status: 'deleted',
        updated_at: now,
      })
      .eq('id', puzzleId)

    if (error) {
      errorMessage.value = error.message
      throw error
    }

    removePuzzle(puzzleId)
    if (activePuzzle.value?.id === puzzleId) {
      clearActivePuzzle(true)
    }
  }

  async function endGame() {
    await closePuzzle()
  }

  function clearActivePuzzle(removeChannel = true) {
    if (removeChannel && activePuzzleChannel.value) {
      supabase.removeChannel(activePuzzleChannel.value)
    }

    activePuzzleChannel.value = null
    activePuzzle.value = null
    board.value = createEmptyBoard()
    fixedCells.value = []
    solution.value = createEmptyBoard()
  }

  function syncActivePuzzle(puzzle) {
    const normalized = normalizePuzzleRow(puzzle)
    if (!normalized) return

    activePuzzle.value = normalized
    board.value = normalized.board
    fixedCells.value = normalized.fixed_cells
    solution.value = normalized.solution
  }

  function subscribeToActivePuzzle(puzzleId) {
    if (activePuzzleChannel.value) {
      supabase.removeChannel(activePuzzleChannel.value)
    }

    activePuzzleChannel.value = supabase
      .channel(`couple-sudoku:${puzzleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sudoku_sessions',
          filter: `id=eq.${puzzleId}`,
        },
        (payload) => {
          if (!payload?.new) {
            return
          }

          const nextPuzzle = normalizePuzzleRow(payload.new)

          if (nextPuzzle?.deleted_at) {
            removePuzzle(nextPuzzle.id)
            clearActivePuzzle(true)
            return
          }

          syncActivePuzzle(nextPuzzle)
          upsertPuzzle(nextPuzzle)
        }
      )
      .subscribe()
  }

  async function fetchSudokuFromAPI(difficulty) {
    const apiKey = import.meta.env.VITE_YOUDOSUDOKU_API_KEY
    if (!apiKey) {
      throw new Error('API key for youdosudoku.com is not configured.')
    }

    const response = await fetch('/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        difficulty,
        solution: true,
        array: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error fetching sudoku: ${response.statusText}`)
    }

    return response.json()
  }

  function resetRuntimeState() {
    if (libraryChannel.value) {
      supabase.removeChannel(libraryChannel.value)
    }

    if (activePuzzleChannel.value) {
      supabase.removeChannel(activePuzzleChannel.value)
    }

    libraryChannel.value = null
    activePuzzleChannel.value = null
    coupleId.value = null
    coupleMember.value = null
    puzzles.value = []
    activePuzzle.value = null
    board.value = createEmptyBoard()
    fixedCells.value = []
    solution.value = createEmptyBoard()
    isLoading.value = false
    isInitialized.value = false
    errorMessage.value = ''
  }

  function resetStore() {
    resetRuntimeState()
  }

  return {
    activePuzzle,
    board,
    coupleId,
    coupleMember,
    deletePuzzle,
    endGame,
    errorMessage,
    fixedCells,
    gameId,
    gameStatus,
    init,
    isActivePuzzleFinished,
    isInitialized,
    isLoading,
    openPuzzle,
    persistActivePuzzle,
    puzzles,
    puzzlesByDifficulty,
    refreshLibrary,
    resetStore,
    selectedDifficulty,
    solution,
    startNewGame,
    updateCell,
    closePuzzle,
  }
})

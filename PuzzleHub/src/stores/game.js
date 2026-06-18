import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from './auth'

const DIFFICULTIES = ['easy', 'medium', 'hard']

function createEmptyBoard() {
  return Array(81).fill(0)
}

function createEmptyCandidateNotes() {
  return Array.from({ length: 81 }, () => [])
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

function normalizeCandidateNotes(notes) {
  const empty = createEmptyCandidateNotes()

  if (!Array.isArray(notes)) {
    return empty
  }

  return empty.map((fallback, index) => {
    const cellNotes = Array.isArray(notes[index]) ? notes[index] : fallback
    return [
      ...new Set(
        cellNotes.map((value) => Number(value)).filter((value) => value >= 1 && value <= 9),
      ),
    ].sort((a, b) => a - b)
  })
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false
  }

  return a.every((value, index) => Number(value) === Number(b[index]))
}

function hasCandidateNotes(candidateNotes) {
  return (
    Array.isArray(candidateNotes) &&
    candidateNotes.some((entry) => Array.isArray(entry) && entry.length > 0)
  )
}

function getFixedCells(board) {
  return board.reduce((cells, value, index) => {
    if (Number(value) !== 0) {
      cells.push(index)
    }

    return cells
  }, [])
}

function derivePuzzleStatus(
  board,
  initialBoard,
  solution,
  candidateNotes = [],
  forcePaused = false,
) {
  const normalizedBoard = normalizeBoard(board)
  const normalizedInitialBoard = normalizeBoard(initialBoard)
  const normalizedSolution = normalizeBoard(solution)

  if (arraysEqual(normalizedBoard, normalizedSolution)) {
    return 'finished'
  }

  if (forcePaused) {
    return 'paused'
  }

  if (arraysEqual(normalizedBoard, normalizedInitialBoard) && !hasCandidateNotes(candidateNotes)) {
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
    hints_remaining: Number.isFinite(Number(row.hints_remaining)) ? Number(row.hints_remaining) : 3,
    candidate_notes: normalizeCandidateNotes(row.candidate_notes),
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

function formatFallbackName(user) {
  const fullName = user?.user_metadata?.display_name || user?.user_metadata?.name
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim()
  }

  if (typeof user?.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0]
  }

  return 'Spieler'
}

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()

  const coupleId = ref(null)
  const coupleMember = ref(null)
  const puzzles = ref([])
  const coupleMembers = ref([])
  const activePuzzle = ref(null)
  const board = ref(createEmptyBoard())
  const fixedCells = ref([])
  const solution = ref(createEmptyBoard())
  const candidateNotes = ref(createEmptyCandidateNotes())
  const hintsRemaining = ref(3)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const errorMessage = ref('')
  const libraryChannel = ref(null)
  const activePuzzleChannel = ref(null)

  const gameId = computed(() => activePuzzle.value?.id || null)
  const gameStatus = computed(() => (activePuzzle.value ? 'active' : 'idle'))
  const selectedDifficulty = computed(() => activePuzzle.value?.difficulty || null)
  const isActivePuzzleFinished = computed(
    () => activePuzzle.value?.status === 'finished' || arraysEqual(board.value, solution.value),
  )
  const currentPlayerName = computed(() => {
    const current = coupleMembers.value.find((member) => member.user_id === authStore.user?.id)
    return current?.display_name?.trim() || formatFallbackName(authStore.user)
  })
  const partnerPlayerName = computed(() => {
    const partner = coupleMembers.value.find((member) => member.user_id !== authStore.user?.id)
    return partner?.display_name?.trim() || 'Partner'
  })
  const coupleRosterLabel = computed(() => {
    const current = currentPlayerName.value
    const partner = partnerPlayerName.value
    return `${current} & ${partner}`
  })

  const puzzlesByDifficulty = computed(() => {
    return DIFFICULTIES.reduce((groups, difficulty) => {
      groups[difficulty] = puzzles.value.filter(
        (puzzle) => getDifficultyOrder(puzzle.difficulty) === difficulty,
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
      await refreshCoupleMembers()
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

  async function refreshCoupleMembers() {
    const scopeId = await ensureCoupleScope()

    const { data, error } = await supabase
      .from('couple_members')
      .select('*')
      .eq('couple_id', scopeId)

    if (error) {
      throw error
    }

    coupleMembers.value = (data || []).map((member) => ({
      ...member,
      display_name: typeof member.display_name === 'string' ? member.display_name.trim() : '',
    }))
  }

  function subscribeToLibrary() {
    if (libraryChannel.value || !coupleId.value) {
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
        },
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

  async function saveActivePuzzle(patch, options = {}) {
    const { persist = true } = options

    if (!activePuzzle.value || !gameId.value) {
      return
    }

    const nextPuzzle = {
      ...activePuzzle.value,
      ...patch,
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'board')) {
      nextPuzzle.board = normalizeBoard(patch.board)
      board.value = nextPuzzle.board
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'candidate_notes')) {
      nextPuzzle.candidate_notes = normalizeCandidateNotes(patch.candidate_notes)
      candidateNotes.value = nextPuzzle.candidate_notes
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'hints_remaining')) {
      nextPuzzle.hints_remaining = Math.max(0, Number(patch.hints_remaining) || 0)
      hintsRemaining.value = nextPuzzle.hints_remaining
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'fixed_cells')) {
      nextPuzzle.fixed_cells = normalizeCells(patch.fixed_cells)
      fixedCells.value = nextPuzzle.fixed_cells
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'solution')) {
      nextPuzzle.solution = normalizeBoard(patch.solution)
      solution.value = nextPuzzle.solution
    }

    activePuzzle.value = nextPuzzle

    if (!persist) {
      return nextPuzzle
    }

    const { error } = await supabase.from('sudoku_sessions').update(patch).eq('id', gameId.value)
    if (error) {
      errorMessage.value = error.message
      throw error
    }

    return nextPuzzle
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
      const emptyNotes = createEmptyCandidateNotes()

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
          candidate_notes: emptyNotes,
          hints_remaining: 3,
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
    if (!activePuzzle.value || fixedCells.value.includes(index)) {
      return
    }

    const nextBoard = [...board.value]
    nextBoard[index] = Number(value) || 0
    const nextNotes = [...candidateNotes.value]
    nextNotes[index] = []
    const nextStatus = derivePuzzleStatus(
      nextBoard,
      activePuzzle.value.initial_board,
      solution.value,
      nextNotes,
    )

    await saveActivePuzzle({
      board: nextBoard,
      candidate_notes: nextNotes,
      status: nextStatus,
      updated_at: new Date().toISOString(),
      last_opened_at: new Date().toISOString(),
      last_edited_by: authStore.user?.id || null,
    })
  }

  async function toggleCandidate(index, candidate) {
    if (!activePuzzle.value || fixedCells.value.includes(index)) {
      return
    }

    const digit = Number(candidate)
    if (!Number.isInteger(digit) || digit < 1 || digit > 9) {
      return
    }

    if (board.value[index] !== 0) {
      return
    }

    const nextNotes = candidateNotes.value.map((entry, noteIndex) => {
      if (noteIndex !== index) {
        return entry
      }

      const existing = Array.isArray(entry) ? [...entry] : []
      const next = existing.includes(digit)
        ? existing.filter((value) => value !== digit)
        : [...existing, digit]

      return next.sort((a, b) => a - b)
    })
    const nextStatus = derivePuzzleStatus(
      board.value,
      activePuzzle.value.initial_board,
      solution.value,
      nextNotes,
    )

    await saveActivePuzzle({
      board: [...board.value],
      candidate_notes: nextNotes,
      status: nextStatus,
      updated_at: new Date().toISOString(),
      last_opened_at: new Date().toISOString(),
      last_edited_by: authStore.user?.id || null,
    })
  }

  async function clearCell(index) {
    if (!activePuzzle.value || fixedCells.value.includes(index)) {
      return
    }

    const nextBoard = [...board.value]
    nextBoard[index] = 0
    const nextNotes = [...candidateNotes.value]
    nextNotes[index] = []
    const nextStatus = derivePuzzleStatus(
      nextBoard,
      activePuzzle.value.initial_board,
      solution.value,
      nextNotes,
    )

    await saveActivePuzzle({
      board: nextBoard,
      candidate_notes: nextNotes,
      status: nextStatus,
      updated_at: new Date().toISOString(),
      last_opened_at: new Date().toISOString(),
      last_edited_by: authStore.user?.id || null,
    })
  }

  async function useHint(index) {
    if (!activePuzzle.value || !gameId.value) {
      return
    }

    if (hintsRemaining.value <= 0) {
      throw new Error('Keine Tipps mehr verfügbar.')
    }

    const fallbackIndex = board.value.findIndex((value, cellIndex) => {
      return value === 0 && !fixedCells.value.includes(cellIndex)
    })
    const targetIndex = Number.isInteger(index) ? index : fallbackIndex

    if (targetIndex < 0 || fixedCells.value.includes(targetIndex)) {
      throw new Error('Bitte wähle ein leeres Feld für den Tipp aus.')
    }

    const nextBoard = [...board.value]
    nextBoard[targetIndex] = solution.value[targetIndex]
    const nextNotes = [...candidateNotes.value]
    nextNotes[targetIndex] = []
    const nextHints = Math.max(0, hintsRemaining.value - 1)
    const nextStatus = derivePuzzleStatus(
      nextBoard,
      activePuzzle.value.initial_board,
      solution.value,
      nextNotes,
    )
    const now = new Date().toISOString()

    await saveActivePuzzle({
      board: nextBoard,
      candidate_notes: nextNotes,
      hints_remaining: nextHints,
      status: nextStatus,
      updated_at: now,
      last_opened_at: now,
      last_edited_by: authStore.user?.id || null,
    })
  }

  async function closePuzzle() {
    if (!activePuzzle.value) {
      return
    }

    const shouldPause = !isActivePuzzleFinished.value
    const nextBoard = [...board.value]
    const nextNotes = [...candidateNotes.value]

    try {
      if (shouldPause) {
        const status = derivePuzzleStatus(
          nextBoard,
          activePuzzle.value.initial_board,
          solution.value,
          nextNotes,
          true,
        )
        await saveActivePuzzle({
          board: nextBoard,
          candidate_notes: nextNotes,
          status,
          updated_at: new Date().toISOString(),
          last_opened_at: new Date().toISOString(),
          last_edited_by: authStore.user?.id || null,
        })
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
    candidateNotes.value = createEmptyCandidateNotes()
    hintsRemaining.value = 3
  }

  function syncActivePuzzle(puzzle) {
    const normalized = normalizePuzzleRow(puzzle)
    if (!normalized) return

    activePuzzle.value = normalized
    board.value = normalized.board
    fixedCells.value = normalized.fixed_cells
    solution.value = normalized.solution
    candidateNotes.value = normalized.candidate_notes
    hintsRemaining.value = normalized.hints_remaining
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
        },
      )
      .subscribe()
  }

  
  async function fetchSudokuFromAPI(difficulty) {
  const apiKey = import.meta.env.VITE_YOUDOSUDOKU_API_KEY

  try {
    const response = await fetch('https://youdosudoku.com/api', {
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

    const text = await response.text()

    if (!response.ok) {
      alert(`❌ HTTP ${response.status}\n\n${text}`)
      throw new Error(text)
    }

    return JSON.parse(text)
  } catch (err) {
    alert(`❌ FETCH FAILED:\n\n${err.message}`)
    throw err
  }
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
    coupleMembers.value = []
    puzzles.value = []
    activePuzzle.value = null
    board.value = createEmptyBoard()
    fixedCells.value = []
    solution.value = createEmptyBoard()
    candidateNotes.value = createEmptyCandidateNotes()
    hintsRemaining.value = 3
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
    candidateNotes,
    coupleId,
    coupleMember,
    coupleMembers,
    clearCell,
    deletePuzzle,
    endGame,
    errorMessage,
    fixedCells,
    gameId,
    gameStatus,
    hintsRemaining,
    init,
    isActivePuzzleFinished,
    isInitialized,
    isLoading,
    openPuzzle,
    refreshLibrary,
    refreshCoupleMembers,
    resetStore,
    currentPlayerName,
    selectedDifficulty,
    solution,
    startNewGame,
    partnerPlayerName,
    coupleRosterLabel,
    toggleCandidate,
    updateCell,
    useHint,
    closePuzzle,
    puzzles,
    puzzlesByDifficulty,
  }
})

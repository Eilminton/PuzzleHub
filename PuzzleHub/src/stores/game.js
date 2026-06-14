import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', () => {
  // ==========================================
  // STATE
  // ==========================================
  const session = ref(null)
  const board = ref(Array(81).fill(0))
  const fixedCells = ref([])
  const solution = ref(Array(81).fill(0))
  const isLoading = ref(false)
  const isPartnerOnline = ref(false)
  const gameStatus = ref('idle') // 'idle', 'waiting', 'active', 'finished'
  const realtimeChannel = ref(null)
  const lobbyChannel = ref(null)

  const authStore = useAuthStore()

  // ==========================================
  // GETTERS
  // ==========================================
  const gameId = computed(() => session.value?.id)
  const isHost = computed(() => authStore.user?.id === session.value?.host_id)
  const isPartner = computed(() => authStore.user?.id === session.value?.partner_id)
  const isMyTurn = computed(() => true)

  // ==========================================
  // ACTIONS (Haupt-Spiellogik)
  // ==========================================
  async function init() {
    console.log('🔍 [GameStore] init() gestartet für User:', authStore.user?.id)
    if (!authStore.user) {
      console.log('🛑 [GameStore] Kein authentifizierter User gefunden. Breche ab.')
      gameStatus.value = 'idle'
      return
    }

    isLoading.value = true
    try {
      // 1. Prüfe auf bereits aktive Sessions
      console.log('📡 [GameStore] Prüfe auf existierende aktive Sessions...')
      let { data: myActiveSession, error: myActiveError } = await supabase
        .from('sudoku_sessions')
        .select('*')
        .or(`host_id.eq.${authStore.user.id},partner_id.eq.${authStore.user.id}`)
        .eq('session_status', 'active')
        .maybeSingle()

      if (myActiveError) throw myActiveError

      if (myActiveSession) {
        console.log('✅ [GameStore] Aktive Session gefunden! ID:', myActiveSession.id)
        loadSessionData(myActiveSession)
        gameStatus.value = 'active'
        return
      }

      // 2. Prüfe auf wartende Sessions von anderen Spielern
      console.log('📡 [GameStore] Keine aktive Session. Suche nach wartenden Spielen...')
      let { data: waitingSession, error: waitingError } = await supabase
        .from('sudoku_sessions')
        .select('*')
        .eq('session_status', 'waiting')
        .is('partner_id', null)
        .neq('host_id', authStore.user.id)
        .limit(1)
        .maybeSingle()

      if (waitingError) throw waitingError

      if (waitingSession) {
        console.log(`🚀 [GameStore] Wartendes Spiel beim Start gefunden. Trete bei...`)
        await joinGame(waitingSession.id)
        return
      }

      // 3. Wenn kein Spiel da ist, lausche LIVE auf der Lobby, ob jemand eins erstellt
      console.log('ℹ️ Keine Spiele offen. Starte Live-Lobby-Überwachung...')
      gameStatus.value = 'idle'
      subscribeToLobby()
    } catch (err) {
      console.error('💥 [GameStore] Fehler im init():', err.message)
      resetStore()
    } finally {
      isLoading.value = false
    }
  }

  async function startNewGame(difficulty = 'easy') {
    console.log(`🎮 [GameStore] startNewGame() getriggert. Schwierigkeit: ${difficulty}`)
    isLoading.value = true
    try {
      const puzzleResponse = await fetchMockSudokuPuzzle(difficulty)

      const newBoard = puzzleResponse.puzzle.split('').map(Number)
      const newSolution = puzzleResponse.solution.split('').map(Number)

      const newFixedCells = []
      newBoard.forEach((val, index) => {
        if (val !== 0) newFixedCells.push(index)
      })

      console.log('📡 [GameStore] Sende neue Session an Supabase...', {
        host_id: authStore.user.id,
        boardPreview: newBoard.slice(0, 5),
      })

      const { data, error } = await supabase
        .from('sudoku_sessions')
        .insert({
          host_id: authStore.user.id,
          board: newBoard,
          fixed_cells: newFixedCells,
          solution: newSolution,
          session_status: 'waiting',
          partner_online: false,
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [GameStore] Fehler beim Insert der neuen Session:', error)
        throw error
      }

      console.log('🎉 [GameStore] Neue Session erfolgreich in DB erstellt! ID:', data.id)
      loadSessionData(data)
      gameStatus.value = 'waiting'
    } catch (err) {
      console.error('💥 [GameStore] Fehler beim Spielstart:', err.message)
      resetStore()
    } finally {
      isLoading.value = false
    }
  }

  async function joinGame(sessionId) {
    console.log(`🤝 [GameStore] joinGame() aufgerufen für Session ID: ${sessionId}`)
    isLoading.value = true
    try {
      console.log(
        `📡 [GameStore] Sende Update-Befehl an Supabase: Partner ID ${authStore.user.id} eintippen...`,
      )
      const { data, error } = await supabase
        .from('sudoku_sessions')
        .update({
          partner_id: authStore.user.id,
          session_status: 'active',
          partner_online: true,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        console.error('❌ [GameStore] Supabase hat das Update beim Beitreten verweigert:', error)
        throw error
      }

      console.log('🥳 [GameStore] Erfolgreich der Session beigetreten! Daten geladen.')
      loadSessionData(data)
      gameStatus.value = 'active'
    } catch (err) {
      console.error('💥 [GameStore] Fehler beim Beitreten des Spiels:', err.message)
      resetStore()
    } finally {
      isLoading.value = false
    }
  }

  async function updateCell(index, value) {
    if (!session.value || !gameId.value) {
      console.warn('⚠️ [GameStore] updateCell() ignoriert: Keine aktive Session vorhanden.')
      return
    }
    if (fixedCells.value.includes(index)) {
      console.warn(`⚠️ [GameStore] Zelle ${index} ist fixiert und darf nicht geändert werden.`)
      return
    }

    console.log(`✍️ [GameStore] Update Zelle Index ${index} -> Wert: ${value}`)
    const newBoard = [...board.value]
    newBoard[index] = value

    try {
      const { error } = await supabase
        .from('sudoku_sessions')
        .update({ board: newBoard })
        .eq('id', gameId.value)

      if (error) throw error
    } catch (err) {
      console.error('❌ [GameStore] Fehler beim Senden des Zell-Updates:', err.message)
    }
  }

  async function endGame() {
    if (!session.value || !gameId.value) {
      console.warn('⚠️ [GameStore] endGame() ignoriert: Keine aktive Session vorhanden.')
      return
    }

    console.log(`🏁 [GameStore] Beende Spiel mit Session ID: ${gameId.value}`)
    try {
      await supabase
        .from('sudoku_sessions')
        .update({ session_status: 'finished' })
        .eq('id', gameId.value)

      resetStore()
    } catch (err) {
      console.error('❌ [GameStore] Fehler beim Beenden des Spiels:', err.message)
    }
  }

  // ==========================================
  // REALTIME SUBSCRIPTIONS & HELPERS
  // ==========================================
  function loadSessionData(supabaseSession) {
    console.log('📦 [GameStore] Lade Session-Daten in den lokalen State...', supabaseSession)
    session.value = supabaseSession
    board.value = supabaseSession.board
    fixedCells.value = supabaseSession.fixed_cells || []
    solution.value = supabaseSession.solution || []
    isPartnerOnline.value = supabaseSession.partner_online || false

    subscribeToGameChanges(supabaseSession.id)
  }

  function subscribeToLobby() {
    if (lobbyChannel.value) return

    lobbyChannel.value = supabase
      .channel('public:sudoku_lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sudoku_sessions' },
        async (payload) => {
          if (
            payload.new.session_status === 'waiting' &&
            payload.new.host_id !== authStore.user.id
          ) {
            console.log(
              '⚡ [Lobby] Neues Spiel live entdeckt! Trete automatisch bei:',
              payload.new.id,
            )

            if (lobbyChannel.value) supabase.removeChannel(lobbyChannel.value)
            lobbyChannel.value = null

            await joinGame(payload.new.id)
          }
        },
      )
      .subscribe()
  }

  function subscribeToGameChanges(sessionId) {
    console.log(`🔌 [GameStore] Starte Realtime-Subscription für Session ${sessionId}`)
    if (realtimeChannel.value) {
      console.log('🔄 [GameStore] Alter Realtime-Kanal geschlossen.')
      supabase.removeChannel(realtimeChannel.value)
    }

    realtimeChannel.value = supabase
      .channel(`sudoku_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sudoku_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('⚡ [GameStore] Realtime UPDATE empfangen!', payload.new)
          session.value = payload.new
          board.value = payload.new.board
          gameStatus.value = payload.new.session_status
          isPartnerOnline.value = payload.new.partner_online || false
        },
      )
      .subscribe((status) => {
        console.log(`📡 [GameStore] Realtime Status gewechselt zu: ${status}`)
        if (status === 'SUBSCRIBED') updatePartnerOnlineStatus(true)
        if (status === 'CLOSED') updatePartnerOnlineStatus(false)
      })
  }

  async function updatePartnerOnlineStatus(isOnline) {
    if (!session.value || !authStore.user) return
    if (authStore.user.id !== session.value.partner_id) {
      console.log('ℹ️ [GameStore] Bin Host, überspringe "partner_online" Status-Update.')
      return
    }

    console.log(`📡 [GameStore] Setze partner_online auf: ${isOnline}`)
    await supabase
      .from('sudoku_sessions')
      .update({ partner_online: isOnline })
      .eq('id', session.value.id)
  }

  function resetStore() {
    console.log('🧹 [GameStore] Resette gesamten Store-State.')
    if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
    if (lobbyChannel.value) supabase.removeChannel(lobbyChannel.value)
    realtimeChannel.value = null
    lobbyChannel.value = null
    session.value = null
    board.value = Array(81).fill(0)
    fixedCells.value = []
    solution.value = Array(81).fill(0)
    gameStatus.value = 'idle'
  }

  async function fetchMockSudokuPuzzle(difficulty) {
    return Promise.resolve({
      difficulty: difficulty,
      puzzle: '003000540007080000100537960061005070408000620090608013800760354004003796700009200',
      solution: '983126547657984132142537968361245879478391625295678413819762354524813796736459281',
    })
  }

  return {
    session,
    board,
    fixedCells,
    isLoading,
    gameStatus,
    isPartnerOnline,
    gameId,
    isHost,
    isPartner,
    init,
    startNewGame,
    joinGame,
    updateCell,
    resetStore,
    endGame,
    solution,
  }
})

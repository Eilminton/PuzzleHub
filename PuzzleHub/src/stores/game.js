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
      // Clean up any existing channels before starting
      if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
      if (lobbyChannel.value) supabase.removeChannel(lobbyChannel.value)
      realtimeChannel.value = null
      lobbyChannel.value = null

      // 1. Prüfe auf bereits aktive Sessions
      console.log('📡 [GameStore] Prüfe auf existierende aktive Sessions...')
      let { data: myActiveSession, error: myActiveError } = await supabase
        .from('sudoku_sessions')
        .select('*')
        .or(`host_id.eq.${authStore.user.id},partner_id.eq.${authStore.user.id}`)
        .in('session_status', ['active', 'waiting'])
        .maybeSingle()

      if (myActiveError) throw myActiveError

      if (myActiveSession) {
        console.log('✅ [GameStore] Aktive oder wartende Session gefunden! ID:', myActiveSession.id)
        loadSessionData(myActiveSession)
        gameStatus.value = myActiveSession.session_status
        return
      }

      // 2. Prüfe auf wartende Sessions von anderen Spielern
      console.log('📡 [GameStore] Keine eigene Session. Suche nach fremden wartenden Spielen...')
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
    // Unsubscribe from lobby when creating a game to avoid joining own game
    if (lobbyChannel.value) {
        console.log('🚪 [Lobby] Temporär von Lobby abgemeldet, um eigenes Spiel zu erstellen.')
        supabase.removeChannel(lobbyChannel.value)
        lobbyChannel.value = null
    }

    try {
      const puzzleResponse = await fetchMockSudokuPuzzle(difficulty)

      const newBoard = puzzleResponse.puzzle.split('').map(Number)
      const newSolution = puzzleResponse.solution.split('').map(Number)

      const newFixedCells = []
      newBoard.forEach((val, index) => {
        if (val !== 0) newFixedCells.push(index)
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

      if (error) throw error

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
    // Unsubscribe from lobby when joining a game
    if (lobbyChannel.value) {
        console.log('🚪 [Lobby] Von Lobby abgemeldet, da Spiel beigetreten.')
        supabase.removeChannel(lobbyChannel.value)
        lobbyChannel.value = null
    }

    try {
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

      if (error) throw error

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
    if (!session.value || !gameId.value) return
    if (fixedCells.value.includes(index)) return

    const newBoard = [...board.value]
    newBoard[index] = value

    try {
      await supabase.from('sudoku_sessions').update({ board: newBoard }).eq('id', gameId.value)
    } catch (err) {
      console.error('❌ [GameStore] Fehler beim Senden des Zell-Updates:', err.message)
    }
  }

  async function endGame() {
    if (!session.value || !gameId.value) return
    console.log(`🏁 [GameStore] Beende Spiel mit Session ID: ${gameId.value}`)
    const { error } = await supabase
        .from('sudoku_sessions')
        .update({ session_status: 'finished' })
        .eq('id', gameId.value)
    
    if (error) console.error('❌ [GameStore] Fehler beim Beenden des Spiels:', error.message)
    
    // Reset state and re-initialize to listen for new games
    resetStore()
  }

  function loadSessionData(supabaseSession) {
    console.log('📦 [GameStore] Lade Session-Daten in den lokalen State...', supabaseSession)
    session.value = supabaseSession
    board.value = supabaseSession.board
    fixedCells.value = supabaseSession.fixed_cells || []
    solution.value = supabaseSession.solution || []
    isPartnerOnline.value = supabaseSession.partner_online || false

    // Subscribe to changes for the current game
    subscribeToGameChanges(supabaseSession.id)
  }

  function subscribeToLobby() {
    if (lobbyChannel.value) {
      console.log('ℹ️ [Lobby] Subscription ist bereits aktiv.')
      return
    }

    console.log('🔌 [Lobby] Starte neue Subscription für die Lobby...')
    lobbyChannel.value = supabase
      .channel('public:sudoku_lobby')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sudoku_sessions' },
        async (payload) => {
          console.log('📬 [Lobby] Eingehendes Event:', payload)
          if (
            payload.new.session_status === 'waiting' &&
            payload.new.host_id !== authStore.user.id
          ) {
            console.log(
              '⚡ [Lobby] Neues Spiel live entdeckt! Trete automatisch bei:',
              payload.new.id,
            )
            await joinGame(payload.new.id)
          } else {
            console.log('⏭️ [Lobby] Event ignoriert (eigenes Spiel oder nicht "waiting").')
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Lobby] Erfolgreich für die Lobby angemeldet!')
        } else {
          console.log(`[Lobby] Status: ${status}`, err || '')
        }
      })
  }

  function subscribeToGameChanges(sessionId) {
    if (realtimeChannel.value) {
      console.log('🔄 [GameStore] Alter Realtime-Kanal wird entfernt.')
      supabase.removeChannel(realtimeChannel.value)
    }

    console.log(`🔌 [GameStore] Starte Realtime-Subscription für Session ${sessionId}`)
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

          if (payload.new.session_status === 'finished') {
              console.log("🏁 Partner hat das Spiel beendet.")
              resetStore()
          }
        },
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Game] Subscription zu Session ${sessionId} erfolgreich.`)
            updatePartnerOnlineStatus(true)
          } else {
            console.log(`[Game] Subscription Status: ${status}`, err || '')
          }
      })
  }

  async function updatePartnerOnlineStatus(isOnline) {
    if (!session.value || !authStore.user || authStore.user.id === session.value.host_id) return

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
    // Nach dem Reset wird die App dank `onMounted` in HomeView neu initialisiert
    // und `init()` aufgerufen, was bei Bedarf die Lobby-Subscription neu startet.
    init()
  }

  // Helper for mock data
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

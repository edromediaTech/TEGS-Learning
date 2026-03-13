import { io, Socket } from 'socket.io-client'

interface LiveStudent {
  sessionKey: string
  studentName: string
  status: 'online' | 'submitted' | 'disconnected' | 'eliminated'
  currentScreen: number
  currentQuestion: number
  totalScore: number
  totalMaxScore: number
  answeredCount: number
  blurCount: number
  joinedAt?: string
  submittedAt?: string
  lastActivity?: string
  lastSnapshot?: string
  lastSnapshotAt?: string
  eliminatedAt?: string
  eliminationReason?: string
  audioAlert?: boolean
}

interface ContestState {
  moduleId: string
  status: 'lobby' | 'countdown' | 'running' | 'frozen' | 'paused' | 'finished'
  currentIndex: number
  totalQuestions: number
  currentQuestion: { index: number; text: string; type: string; points: number; duration: number } | null
  remaining: number
  startedAt: string | null
  eliminatedCount: number
  participantCount: number
}

interface Ranking {
  sessionKey: string
  name: string
  score: number
  maxScore: number
  answeredCount: number
  avgTime: number
  rank: number
  streak?: number
  bestStreak?: number
}

interface BreakingEvent {
  type: 'new_leader' | 'top3_entry' | 'perfect_streak'
  name: string
  rank?: number
  score?: number
  streak?: number
}

interface WebRTCState {
  sessionKey: string | null
  studentName: string | null
  mediaType: 'camera' | 'mic' | 'both' | null
  stream: MediaStream | null
  pc: RTCPeerConnection | null
}

interface QuestionStats {
  questionIndex: number
  correct: number
  total: number
  percentage: number
}

interface DistributionItem {
  answer: string
  count: number
  percentage: number
  isCorrect: boolean
}

interface RevealData {
  questionIndex: number
  questionText: string
  questionType: string
  correctAnswer: string
  correctIndex: number | null
  explanation: string | null
  stats: { correct: number; total: number; percentage: number }
  distribution: DistributionItem[]
  revealDuration: number
}

export function useLiveSocket(moduleId: string) {
  const config = useRuntimeConfig()

  const connected = ref(false)
  const students = ref<Map<string, LiveStudent>>(new Map())
  const studentList = computed(() => Array.from(students.value.values()))
  const alerts = ref<Array<{ type: string; message: string; timestamp: string }>>([])

  // Contest state
  const contestState = ref<ContestState | null>(null)
  const contestTick = ref(0) // remaining seconds for current question
  const contestCountdown = ref(0) // 3…2…1…GO countdown
  const questionStats = ref<Map<number, QuestionStats>>(new Map())
  const contestResults = ref<QuestionStats[]>([])
  const rankings = ref<Ranking[]>([])
  const isTransitioning = ref(false)
  const breakingNews = ref<BreakingEvent[]>([])
  const revealData = ref<RevealData | null>(null)

  // Proctoring
  const snapshots = ref<Map<string, { imageData: string; timestamp: string }>>(new Map())

  // WebRTC
  const webrtcState = ref<WebRTCState>({
    sessionKey: null,
    studentName: null,
    mediaType: null,
    stream: null,
    pc: null,
  })

  let socket: Socket | null = null

  function connect() {
    const baseURL = config.public.apiBase?.replace('/api', '') || 'http://localhost:3000'
    const session = useCookie<{ token: string; tenant_id: string } | null>('__session').value
    const token = session?.token || useCookie('auth_token').value

    socket = io(`${baseURL}/prof`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      connected.value = true
      socket!.emit('join_room', { moduleId })
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    // ── STUDENT ROSTER ────────────────────────────────────
    socket.on('student_roster', (roster: LiveStudent[]) => {
      const map = new Map<string, LiveStudent>()
      roster.forEach(s => map.set(s.sessionKey, s))
      students.value = map
    })

    socket.on('student_joined', (data: any) => {
      const existing = students.value.get(data.sessionKey)
      students.value.set(data.sessionKey, {
        sessionKey: data.sessionKey,
        studentName: data.studentName || 'Anonyme',
        status: 'online',
        currentScreen: existing?.currentScreen || 0,
        currentQuestion: existing?.currentQuestion || 0,
        totalScore: existing?.totalScore || 0,
        totalMaxScore: existing?.totalMaxScore || 0,
        answeredCount: existing?.answeredCount || 0,
        blurCount: existing?.blurCount || 0,
        joinedAt: data.joinedAt,
        lastActivity: data.joinedAt,
      })
      students.value = new Map(students.value)
    })

    socket.on('student_navigation', (data: any) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.currentScreen = data.screenIndex
        s.currentQuestion = data.questionIndex
        s.lastActivity = new Date().toISOString()
        students.value = new Map(students.value)
      }
    })

    socket.on('student_answer', (data: any) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.totalScore = data.totalScore
        s.totalMaxScore = data.totalMaxScore
        s.answeredCount = data.answeredCount
        s.lastActivity = data.timestamp
        students.value = new Map(students.value)
      }
    })

    socket.on('student_blur', (data: any) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.blurCount = data.blurCount
        students.value = new Map(students.value)
      }
      alerts.value.unshift({
        type: 'blur',
        message: `${data.studentName} a quitte l'onglet (${data.blurCount}x)`,
        timestamp: data.timestamp,
      })
      if (alerts.value.length > 50) alerts.value.pop()
    })

    socket.on('student_submitted', (data: any) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.status = 'submitted'
        s.totalScore = data.totalScore
        s.totalMaxScore = data.maxScore
        s.submittedAt = data.submittedAt
        students.value = new Map(students.value)
      }
    })

    socket.on('student_disconnected', (data: any) => {
      const s = students.value.get(data.sessionKey)
      if (s && s.status !== 'submitted') {
        s.status = 'disconnected'
        students.value = new Map(students.value)
      }
    })

    // ── CONTEST EVENTS ────────────────────────────────────
    socket.on('contest_state', (state: ContestState) => {
      contestState.value = state
    })

    socket.on('contest_tick', (data: { questionIndex: number; remaining: number }) => {
      contestTick.value = data.remaining
    })

    socket.on('contest_lock', (data: any) => {
      if (data.stats) {
        questionStats.value.set(data.questionIndex, {
          questionIndex: data.questionIndex,
          correct: data.stats.correct,
          total: data.stats.total,
          percentage: data.stats.total > 0 ? Math.round((data.stats.correct / data.stats.total) * 100) : 0,
        })
        questionStats.value = new Map(questionStats.value)
      }
    })

    socket.on('contest_question_stats', (data: QuestionStats) => {
      questionStats.value.set(data.questionIndex, data)
      questionStats.value = new Map(questionStats.value)
    })

    socket.on('contest_countdown', (data: { value: number }) => {
      contestCountdown.value = data.value
    })

    socket.on('contest_rankings', (data: Ranking[]) => {
      rankings.value = data || []
    })

    socket.on('contest_breaking_news', (events: BreakingEvent[]) => {
      breakingNews.value = events || []
    })

    socket.on('contest_reveal', (data: RevealData) => {
      revealData.value = data
      // Auto-clear after reveal duration
      const dur = (data.revealDuration || 7000)
      setTimeout(() => {
        revealData.value = null
      }, dur)
    })

    socket.on('contest_end', (data: { reason: string; stats: QuestionStats[]; rankings?: Ranking[] }) => {
      contestResults.value = data.stats || []
      if (data.rankings) rankings.value = data.rankings
      isTransitioning.value = false
      if (contestState.value) {
        contestState.value = { ...contestState.value, status: 'finished' }
      }
    })

    // ── ELIMINATION & ALERTS ────────────────────────────────
    socket.on('student_eliminated', (data: { sessionKey: string; studentName: string; reason: string; timestamp: string }) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.status = 'eliminated'
        s.eliminatedAt = data.timestamp
        s.eliminationReason = data.reason
        students.value = new Map(students.value)
      }
      alerts.value.unshift({
        type: 'eliminated',
        message: `${data.studentName} ELIMINE (${data.reason === 'fullscreen_exit' ? 'sortie plein ecran' : data.reason})`,
        timestamp: data.timestamp,
      })
      if (alerts.value.length > 50) alerts.value.pop()
    })

    socket.on('student_audio_alert', (data: { sessionKey: string; studentName: string; level: number; timestamp: string }) => {
      const s = students.value.get(data.sessionKey)
      if (s) {
        s.audioAlert = true
        students.value = new Map(students.value)
        // Clear after 5s
        setTimeout(() => {
          const st = students.value.get(data.sessionKey)
          if (st) { st.audioAlert = false; students.value = new Map(students.value) }
        }, 5000)
      }
      alerts.value.unshift({
        type: 'audio',
        message: `${data.studentName} — bruit detecte (niveau: ${Math.round(data.level * 100)}%)`,
        timestamp: data.timestamp,
      })
      if (alerts.value.length > 50) alerts.value.pop()
    })

    // ── WEBRTC SIGNALING (professor side) ───────────────────
    socket.on('webrtc_student_ready', (data: { sessionKey: string; studentName: string; mediaType: string }) => {
      // Student accepted media request, now create offer
      if (webrtcState.value.sessionKey === data.sessionKey) {
        createPeerConnection(data.sessionKey)
      }
    })

    socket.on('webrtc_signal', (data: { sessionKey: string; signal: any }) => {
      const pc = webrtcState.value.pc
      if (!pc || webrtcState.value.sessionKey !== data.sessionKey) return
      if (data.signal.type === 'answer') {
        pc.setRemoteDescription(new RTCSessionDescription(data.signal))
      } else if (data.signal.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(data.signal))
      }
    })

    // ── PROCTORING EVENTS ─────────────────────────────────
    socket.on('student_snapshot', (data: { sessionKey: string; studentName: string; imageData: string; timestamp: string }) => {
      if (data.imageData) {
        snapshots.value.set(data.sessionKey, {
          imageData: data.imageData,
          timestamp: data.timestamp,
        })
        snapshots.value = new Map(snapshots.value)

        // Also update student record
        const s = students.value.get(data.sessionKey)
        if (s) {
          s.lastSnapshot = data.imageData
          s.lastSnapshotAt = data.timestamp
          students.value = new Map(students.value)
        }
      }
    })

    socket.on('error_msg', (data: any) => {
      console.error('[LiveSocket]', data.message)
    })
  }

  // ── CONTEST CONTROLS ──────────────────────────────────
  function contestStart() {
    socket?.emit('contest_start', { moduleId })
  }

  function contestPause() {
    socket?.emit('contest_pause', { moduleId })
  }

  function contestResume() {
    socket?.emit('contest_resume', { moduleId })
  }

  function contestSkip() {
    socket?.emit('contest_skip', { moduleId })
  }

  function contestStop() {
    socket?.emit('contest_stop', { moduleId })
  }

  // ── PROCTORING CONTROLS ───────────────────────────────
  function requestSnapshot(sessionKey: string) {
    socket?.emit('proctor_request_snapshot', { moduleId, sessionKey })
  }

  function requestAllSnapshots() {
    socket?.emit('proctor_request_all_snapshots', { moduleId })
  }

  // ── WEBRTC CONTROLS ─────────────────────────────────
  function requestMedia(sessionKey: string, studentName: string, mediaType: 'camera' | 'mic' | 'both') {
    webrtcState.value = { sessionKey, studentName, mediaType, stream: null, pc: null }
    socket?.emit('webrtc_request_media', { moduleId, sessionKey, mediaType })
  }

  function stopMedia() {
    const state = webrtcState.value
    if (state.pc) {
      state.pc.close()
    }
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop())
    }
    if (state.sessionKey) {
      socket?.emit('webrtc_stop_media', { moduleId, sessionKey: state.sessionKey })
    }
    webrtcState.value = { sessionKey: null, studentName: null, mediaType: null, stream: null, pc: null }
  }

  function createPeerConnection(sessionKey: string) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
    webrtcState.value.pc = pc

    pc.ontrack = (event) => {
      webrtcState.value.stream = event.streams[0] || null
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc_signal', {
          targetSessionKey: sessionKey,
          moduleId,
          signal: event.candidate.toJSON(),
        })
      }
    }

    // Create offer with receive-only (we want student's media, not ours)
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      socket?.emit('webrtc_signal', {
        targetSessionKey: sessionKey,
        moduleId,
        signal: offer,
      })
    })
  }

  // ── SPOTLIGHT: Push student camera to live-arena display ──
  const spotlightActive = ref(false)
  const spotlightStudent = ref<{ sessionKey: string; studentName: string } | null>(null)

  function spotlightStart(sessionKey: string, studentName: string) {
    socket?.emit('spotlight_start', { moduleId, sessionKey, studentName })
    spotlightActive.value = true
    spotlightStudent.value = { sessionKey, studentName }
  }

  function spotlightStop() {
    if (spotlightStudent.value) {
      socket?.emit('spotlight_stop', { moduleId, sessionKey: spotlightStudent.value.sessionKey })
    }
    spotlightActive.value = false
    spotlightStudent.value = null
  }

  function disconnect() {
    stopMedia()
    spotlightStop()
    if (socket) {
      socket.disconnect()
      socket = null
      connected.value = false
    }
  }

  onUnmounted(() => disconnect())

  return {
    connected,
    students,
    studentList,
    alerts,
    // Contest
    contestState,
    contestTick,
    contestCountdown,
    questionStats,
    contestResults,
    rankings,
    isTransitioning,
    breakingNews,
    revealData,
    contestStart,
    contestPause,
    contestResume,
    contestSkip,
    contestStop,
    // Proctoring
    snapshots,
    requestSnapshot,
    requestAllSnapshots,
    // WebRTC
    webrtcState,
    requestMedia,
    stopMedia,
    // Spotlight
    spotlightActive,
    spotlightStudent,
    spotlightStart,
    spotlightStop,
    // Connection
    connect,
    disconnect,
  }
}

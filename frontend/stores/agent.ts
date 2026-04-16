import { defineStore } from 'pinia';

interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  proposal?: {
    confirmationId: string;
    summary: string;
    toolId: string;
    details: any;
    status: 'pending' | 'confirmed' | 'rejected';
  };
}

interface AgentProfile {
  name: string;
  description: string;
  canMutate: boolean;
  toolCount: number;
}

interface AgentState {
  panelOpen: boolean;
  sessionId: string | null;
  messages: AgentMessage[];
  isTyping: boolean;
  isConnected: boolean;
  isOffline: boolean;
  enabled: boolean;
  panicMode: boolean;
  profile: AgentProfile | null;
  remainingRequests: number | null;
  unreadCount: number;
  thinkingPhase: 'idle' | 'thinking' | 'searching' | 'slow' | 'offline';
  thinkingStartedAt: number | null;
}

// Local FAQ cache for offline mode
let offlineFAQ: Record<string, string> | null = null;

async function loadOfflineFAQ(): Promise<Record<string, string>> {
  if (offlineFAQ) return offlineFAQ;
  try {
    const data = await $fetch<Record<string, string>>('/agent-faq-cache.json');
    offlineFAQ = data;
    return data;
  } catch {
    offlineFAQ = {};
    return {};
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

export const useAgentStore = defineStore('agent', {
  state: (): AgentState => ({
    panelOpen: false,
    sessionId: null,
    messages: [],
    isTyping: false,
    isConnected: false,
    isOffline: false,
    enabled: false,
    panicMode: false,
    profile: null,
    remainingRequests: null,
    unreadCount: 0,
    thinkingPhase: 'idle',
    thinkingStartedAt: null,
  }),

  getters: {
    hasProposal: (state) =>
      state.messages.some((m) => m.proposal?.status === 'pending'),
  },

  actions: {
    togglePanel() {
      this.panelOpen = !this.panelOpen;
      if (this.panelOpen) {
        this.unreadCount = 0;
      }
    },

    openPanel() {
      this.panelOpen = true;
      this.unreadCount = 0;
    },

    closePanel() {
      this.panelOpen = false;
    },

    // Fetch agent status from backend
    async fetchStatus() {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<any>('/agent/status');
        this.enabled = data.enabled;
        this.panicMode = data.panicMode;
        this.profile = data.profile;
        this.remainingRequests = data.remainingRequests;
      } catch {
        this.enabled = false;
      }
    },

    // Add user message (optimistic UI)
    addUserMessage(content: string) {
      this.messages.push({
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      });
    },

    // Add agent response
    addAgentMessage(content: string, proposal?: AgentMessage['proposal']) {
      this.messages.push({
        id: generateId(),
        role: 'agent',
        content,
        timestamp: new Date().toISOString(),
        proposal,
      });
      if (!this.panelOpen) {
        this.unreadCount++;
      }
    },

    // Set typing state with phase tracking
    setTyping(isTyping: boolean) {
      this.isTyping = isTyping;
      if (isTyping) {
        this.thinkingPhase = 'thinking';
        this.thinkingStartedAt = Date.now();
      } else {
        this.thinkingPhase = 'idle';
        this.thinkingStartedAt = null;
      }
    },

    // Update thinking phase based on elapsed time
    updateThinkingPhase() {
      if (!this.isTyping || !this.thinkingStartedAt) return;
      const elapsed = Date.now() - this.thinkingStartedAt;

      if (elapsed < 2000) {
        this.thinkingPhase = 'thinking';
      } else if (elapsed < 8000) {
        this.thinkingPhase = 'searching';
      } else if (elapsed < 15000) {
        this.thinkingPhase = 'slow';
      } else {
        this.thinkingPhase = 'offline';
        this.isTyping = false;
      }
    },

    // Update proposal status
    updateProposalStatus(confirmationId: string, status: 'confirmed' | 'rejected') {
      const msg = this.messages.find((m) => m.proposal?.confirmationId === confirmationId);
      if (msg && msg.proposal) {
        msg.proposal.status = status;
      }
    },

    // Offline FAQ fallback
    async handleOfflineMessage(content: string) {
      const faq = await loadOfflineFAQ();
      const lower = content.toLowerCase();

      // Search in FAQ
      let bestMatch = '';
      let bestScore = 0;
      for (const [key, answer] of Object.entries(faq)) {
        const keywords = key.toLowerCase().split(/[\s_]+/);
        const score = keywords.filter((k) => lower.includes(k)).length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = answer;
        }
      }

      if (bestMatch) {
        this.addAgentMessage(
          `**Mode hors-ligne** — Je ne peux pas effectuer d'actions, mais voici ce que je peux vous dire :\n\n${bestMatch}`
        );
      } else {
        this.addAgentMessage(
          '**Mode hors-ligne** — Je suis deconnecte du serveur et ne peux pas effectuer d\'actions. Verifiez votre connexion Internet et reessayez.'
        );
      }
    },

    // Clear session
    clearMessages() {
      this.messages = [];
      this.sessionId = null;
    },

    setConnected(val: boolean) {
      this.isConnected = val;
      this.isOffline = !val;
    },

    setSessionId(id: string) {
      this.sessionId = id;
    },
  },
});

import { io, type Socket } from 'socket.io-client';

/**
 * Composable Socket.io pour le namespace /agent.
 * Pattern identique a useTournamentSocket.ts.
 *
 * Reconnexion automatique toutes les 5s en cas de deconnexion.
 */
export function useAgentSocket() {
  const config = useRuntimeConfig();
  const backendUrl = (config.public.apiBase as string).replace('/api', '');
  const auth = useAuthStore();
  const agentStore = useAgentStore();

  const socket = ref<Socket | null>(null);
  const reconnectTimer = ref<ReturnType<typeof setInterval> | null>(null);

  function connect() {
    if (socket.value) return;
    if (!auth.token) return;

    const s = io(`${backendUrl}/agent`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: auth.token },
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: Infinity,
      timeout: 15000,
    });

    s.on('connect', () => {
      agentStore.setConnected(true);
      if (reconnectTimer.value) {
        clearInterval(reconnectTimer.value);
        reconnectTimer.value = null;
      }
    });

    s.on('disconnect', () => {
      agentStore.setConnected(false);
      startReconnect();
    });

    s.on('connect_error', () => {
      agentStore.setConnected(false);
    });

    // Agent response
    s.on('agent_response', (data: { response: string; sessionId: string; proposal?: any; timestamp: string }) => {
      agentStore.setTyping(false);

      if (data.sessionId) {
        agentStore.setSessionId(data.sessionId);
      }

      const proposal = data.proposal
        ? {
            confirmationId: data.proposal.confirmationId,
            summary: data.proposal.summary,
            toolId: data.proposal.toolId,
            details: data.proposal.details,
            status: 'pending' as const,
          }
        : undefined;

      agentStore.addAgentMessage(data.response, proposal);
    });

    // Typing indicator
    s.on('agent_typing', (data: { isTyping: boolean }) => {
      agentStore.setTyping(data.isTyping);
    });

    // Confirmation success
    s.on('agent_confirmed', (data: { confirmationId: string; result: any }) => {
      agentStore.updateProposalStatus(data.confirmationId, 'confirmed');
      agentStore.addAgentMessage(
        `Action confirmee et executee avec succes.\n\n${data.result?.message || ''}`
      );
    });

    // Rejection
    s.on('agent_rejected', (data: { confirmationId: string }) => {
      agentStore.updateProposalStatus(data.confirmationId, 'rejected');
    });

    // Error
    s.on('agent_error', (data: { error: string; panicMode?: boolean }) => {
      agentStore.setTyping(false);
      if (data.panicMode) {
        agentStore.addAgentMessage('L\'assistant est temporairement suspendu par l\'administrateur. Veuillez reessayer plus tard.');
      } else {
        agentStore.addAgentMessage(`Erreur : ${data.error}`);
      }
    });

    // Panic mode broadcast
    s.on('agent_panic_activated', () => {
      agentStore.addAgentMessage('L\'assistant a ete suspendu en urgence par l\'administrateur.');
    });

    s.on('agent_panic_deactivated', () => {
      agentStore.addAgentMessage('L\'assistant a ete reactive. Vous pouvez reprendre vos demandes.');
    });

    // Session cleared
    s.on('agent_session_cleared', () => {
      agentStore.clearMessages();
    });

    socket.value = s;
  }

  function startReconnect() {
    if (reconnectTimer.value) return;
    reconnectTimer.value = setInterval(() => {
      if (!socket.value?.connected) {
        socket.value?.connect();
      } else {
        if (reconnectTimer.value) {
          clearInterval(reconnectTimer.value);
          reconnectTimer.value = null;
        }
      }
    }, 5000);
  }

  async function sendMessage(message: string) {
    // If socket is connected, use real-time channel
    if (socket.value?.connected) {
      socket.value.emit('agent_message', {
        message,
        sessionId: agentStore.sessionId,
      });
      return;
    }

    // Fallback: REST API (works for both auth and public)
    agentStore.setTyping(true);
    try {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      const isAuth = !!auth.token;

      const endpoint = isAuth
        ? `${config.public.apiBase}/agent/chat`
        : `${config.public.apiBase}/agent/public/chat`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isAuth) headers['Authorization'] = `Bearer ${auth.token}`;

      const res = await $fetch<any>(endpoint, {
        method: 'POST',
        headers,
        body: { message, sessionId: agentStore.sessionId },
      });

      agentStore.setTyping(false);

      if (res.sessionId) agentStore.setSessionId(res.sessionId);
      if (res.response) {
        const proposal = res.proposal
          ? {
              confirmationId: res.proposal.confirmationId,
              summary: res.proposal.summary,
              toolId: res.proposal.toolId,
              details: res.proposal.details,
              status: 'pending' as const,
            }
          : undefined;
        agentStore.addAgentMessage(res.response, proposal);
      }
    } catch {
      agentStore.setTyping(false);
      // True offline — no network at all
      agentStore.handleOfflineMessage(message);
    }
  }

  function confirmAction(confirmationId: string) {
    socket.value?.emit('agent_confirm', { confirmationId });
  }

  function rejectAction(confirmationId: string) {
    socket.value?.emit('agent_reject', { confirmationId });
    agentStore.updateProposalStatus(confirmationId, 'rejected');
  }

  function clearSession() {
    socket.value?.emit('agent_clear_session');
    agentStore.clearMessages();
  }

  function disconnect() {
    if (reconnectTimer.value) {
      clearInterval(reconnectTimer.value);
      reconnectTimer.value = null;
    }
    socket.value?.disconnect();
    socket.value = null;
    agentStore.setConnected(false);
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    sendMessage,
    confirmAction,
    rejectAction,
    clearSession,
    socket,
  };
}

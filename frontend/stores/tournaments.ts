import { defineStore } from 'pinia';

// --- Interfaces ---

export interface Prize {
  rank: number;
  label: string;
  amount: number;
  currency: 'HTG' | 'USD';
}

export interface TournamentRound {
  _id?: string;
  order: number;
  label: string;
  module_id: string | null;
  promoteTopX: number;
  status: 'pending' | 'active' | 'completed';
  startTime: string | null;
  endTime: string | null;
}

export interface Tournament {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  registrationFee: number;
  currency: 'HTG' | 'USD';
  maxParticipants: number;
  registrationOpen: string | null;
  registrationClose: string | null;
  rounds: TournamentRound[];
  currentRound: number;
  prizes: Prize[];
  shareToken: string | null;
  participantCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoundResult {
  round: number;
  module_id: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'pending' | 'qualified' | 'eliminated';
}

export interface Participant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  establishment: string;
  district: string;
  competitionToken: string;
  status: 'registered' | 'qualified' | 'eliminated' | 'winner' | 'disqualified';
  roundResults: RoundResult[];
  finalRank: number | null;
  totalScore: number;
  paid: boolean;
}

export interface BracketRound {
  order: number;
  label: string;
  status: string;
  promoteTopX: number;
  startTime: string | null;
  endTime: string | null;
  participants: {
    _id: string;
    name: string;
    establishment: string;
    score: number;
    maxScore: number;
    percentage: number;
    status: string;
  }[];
}

export interface PodiumEntry {
  rank: number;
  firstName: string;
  lastName: string;
  establishment: string;
  totalScore: number;
  prize: Prize | null;
  certificate: {
    tournamentTitle: string;
    rank: number;
    participantName: string;
    date: string;
    prizeAmount: number;
    prizeCurrency: string;
  };
}

// --- Store ---

export const useTournamentStore = defineStore('tournaments', {
  state: () => ({
    tournaments: [] as Tournament[],
    current: null as Tournament | null,
    participants: [] as Participant[],
    bracket: [] as BracketRound[],
    podium: [] as PodiumEntry[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    activeTournaments: (state) =>
      state.tournaments.filter((t) => t.status === 'active'),

    draftTournaments: (state) =>
      state.tournaments.filter((t) => t.status === 'draft'),

    registrationOpen: (state) =>
      state.tournaments.filter((t) => t.status === 'registration'),

    completedTournaments: (state) =>
      state.tournaments.filter((t) => t.status === 'completed'),

    currentRoundInfo: (state) => {
      if (!state.current) return null;
      const idx = state.current.currentRound;
      return state.current.rounds[idx] || null;
    },
  },

  actions: {
    async fetchTournaments() {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{ tournaments: Tournament[] }>('/tournaments');
        this.tournaments = data.tournaments;
      } catch (err: any) {
        this.error = err.message || 'Erreur de chargement';
      } finally {
        this.loading = false;
      }
    },

    async fetchTournament(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{
          tournament: Tournament;
          participants: Participant[];
        }>(`/tournaments/${id}`);
        this.current = data.tournament;
        this.participants = data.participants;
      } catch (err: any) {
        this.error = err.message || 'Erreur de chargement';
      } finally {
        this.loading = false;
      }
    },

    async createTournament(payload: Partial<Tournament>) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{ tournament: Tournament }>('/tournaments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        this.tournaments.unshift(data.tournament);
        return data.tournament;
      } catch (err: any) {
        this.error = err.message || 'Erreur de création';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateTournament(id: string, payload: Partial<Tournament>) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{ tournament: Tournament }>(`/tournaments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        // Mettre à jour dans la liste
        const idx = this.tournaments.findIndex((t) => t._id === id);
        if (idx !== -1) this.tournaments[idx] = data.tournament;
        if (this.current?._id === id) this.current = data.tournament;
        return data.tournament;
      } catch (err: any) {
        this.error = err.message || 'Erreur de mise à jour';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteTournament(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const { apiFetch } = useApi();
        await apiFetch(`/tournaments/${id}`, { method: 'DELETE' });
        this.tournaments = this.tournaments.filter((t) => t._id !== id);
        if (this.current?._id === id) this.current = null;
      } catch (err: any) {
        this.error = err.message || 'Erreur de suppression';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async registerParticipant(tournamentId: string, participant: Partial<Participant>) {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{
          participant: Participant;
          competitionToken: string;
          requiresPayment: boolean;
        }>(`/tournaments/${tournamentId}/register`, {
          method: 'POST',
          body: JSON.stringify(participant),
        });
        this.participants.push(data.participant);
        return data;
      } catch (err: any) {
        this.error = err.message || 'Erreur d\'inscription';
        throw err;
      }
    },

    async fetchBracket(tournamentId: string) {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{
          bracket: BracketRound[];
          podium: PodiumEntry[] | null;
        }>(`/tournaments/${tournamentId}/bracket`);
        this.bracket = data.bracket;
        if (data.podium) this.podium = data.podium;
        return data;
      } catch (err: any) {
        this.error = err.message || 'Erreur de chargement du bracket';
        throw err;
      }
    },

    async startRound(tournamentId: string) {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{ tournament: Tournament }>(
          `/tournaments/${tournamentId}/start-round`,
          { method: 'POST' }
        );
        this.current = data.tournament;
        return data;
      } catch (err: any) {
        this.error = err.message || 'Erreur de démarrage';
        throw err;
      }
    },

    async advanceRound(tournamentId: string) {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{
          tournament: Tournament;
          qualified: any[];
          eliminated: any[];
          isFinished: boolean;
        }>(`/tournaments/${tournamentId}/advance`, {
          method: 'POST',
        });
        this.current = data.tournament;
        return data;
      } catch (err: any) {
        this.error = err.message || 'Erreur de promotion';
        throw err;
      }
    },

    async fetchPodium(tournamentId: string) {
      try {
        const { apiFetch } = useApi();
        const { data } = await apiFetch<{ podium: PodiumEntry[] }>(
          `/tournaments/${tournamentId}/podium`
        );
        this.podium = data.podium;
        return data.podium;
      } catch (err: any) {
        this.error = err.message || 'Erreur de chargement du podium';
        throw err;
      }
    },
  },
});

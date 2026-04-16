import { defineStore } from 'pinia';
import { missions } from '~/config/tours';
import type { TourMission, TourStep } from '~/config/tours';

interface CopilotState {
  /** Panel open/closed */
  panelOpen: boolean;
  /** Currently active mission ID (null = mission list) */
  activeMissionId: string | null;
  /** Current step index within the mission */
  currentStepIndex: number;
  /** Steps validated by the user (step IDs) */
  completedSteps: string[];
  /** Missions fully completed (mission IDs) */
  completedMissions: string[];
  /** Completion timestamps { missionId: ISO date } */
  completionDates: Record<string, string>;
  /** Whether the user has ever seen the welcome tour */
  hasSeenWelcome: boolean;
  /** Is driver.js highlight currently active */
  highlighting: boolean;
  /** Widget position (for drag) */
  position: { x: number; y: number } | null;
}

const STORAGE_KEY = 'tegs-copilot';

function loadState(): Partial<CopilotState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: CopilotState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeMissionId: state.activeMissionId,
    currentStepIndex: state.currentStepIndex,
    completedSteps: state.completedSteps,
    completedMissions: state.completedMissions,
    completionDates: state.completionDates,
    hasSeenWelcome: state.hasSeenWelcome,
    position: state.position,
  }));
}

export const useCopilotStore = defineStore('copilot', {
  state: (): CopilotState => {
    const saved = loadState();
    return {
      panelOpen: false,
      activeMissionId: saved.activeMissionId ?? null,
      currentStepIndex: saved.currentStepIndex ?? 0,
      completedSteps: saved.completedSteps ?? [],
      completedMissions: saved.completedMissions ?? [],
      completionDates: saved.completionDates ?? {},
      hasSeenWelcome: saved.hasSeenWelcome ?? false,
      highlighting: false,
      position: saved.position ?? null,
    };
  },

  getters: {
    /** Current mission object */
    activeMission(): TourMission | null {
      if (!this.activeMissionId) return null;
      return missions.find(m => m.id === this.activeMissionId) ?? null;
    },

    /** Current step object */
    currentStep(): TourStep | null {
      const mission = this.activeMission;
      if (!mission) return null;
      return mission.steps[this.currentStepIndex] ?? null;
    },

    /** Total steps in active mission */
    totalSteps(): number {
      return this.activeMission?.steps.length ?? 0;
    },

    /** Percentage progress of current mission */
    missionProgress(): number {
      const mission = this.activeMission;
      if (!mission) return 0;
      const done = mission.steps.filter(s => this.completedSteps.includes(s.id)).length;
      return Math.round((done / mission.steps.length) * 100);
    },

    /** Is the current step already completed? */
    isCurrentStepDone(): boolean {
      const step = this.currentStep;
      return step ? this.completedSteps.includes(step.id) : false;
    },

    /** Missions available for the current user role */
    availableMissions() {
      return (role: string) => {
        return missions.filter(m =>
          m.roles.length === 0 || m.roles.includes(role)
        );
      };
    },

    /** Is a specific mission fully completed */
    isMissionCompleted() {
      return (missionId: string) => this.completedMissions.includes(missionId);
    },

    /** Get completion date for a mission */
    missionCompletedAt() {
      return (missionId: string) => this.completionDates[missionId] || null;
    },
  },

  actions: {
    /** Start a mission */
    startMission(missionId: string) {
      this.activeMissionId = missionId;
      // Resume from first incomplete step
      const mission = missions.find(m => m.id === missionId);
      if (mission) {
        const firstIncomplete = mission.steps.findIndex(
          s => !this.completedSteps.includes(s.id)
        );
        this.currentStepIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
      } else {
        this.currentStepIndex = 0;
      }
      this.panelOpen = true;
      this._persist();
    },

    /** Go to a specific step */
    goToStep(index: number) {
      if (this.activeMission && index >= 0 && index < this.activeMission.steps.length) {
        this.currentStepIndex = index;
        this._persist();
      }
    },

    /** Mark current step as done and advance */
    completeCurrentStep() {
      const step = this.currentStep;
      if (step && !this.completedSteps.includes(step.id)) {
        this.completedSteps.push(step.id);
      }
      // Auto-advance
      if (this.activeMission && this.currentStepIndex < this.totalSteps - 1) {
        this.currentStepIndex++;
      } else {
        // Mission complete
        this._finishMission();
      }
      this._persist();
    },

    /** Mark a step as done by its ID */
    validateStep(stepId: string) {
      if (!this.completedSteps.includes(stepId)) {
        this.completedSteps.push(stepId);
        this._persist();
      }
    },

    /** Next step */
    nextStep() {
      if (this.currentStepIndex < this.totalSteps - 1) {
        this.currentStepIndex++;
        this._persist();
      }
    },

    /** Previous step */
    prevStep() {
      if (this.currentStepIndex > 0) {
        this.currentStepIndex--;
        this._persist();
      }
    },

    /** Abort mission, go back to list */
    abortMission() {
      this.activeMissionId = null;
      this.currentStepIndex = 0;
      this.highlighting = false;
      this._persist();
    },

    /** Toggle panel */
    togglePanel() {
      this.panelOpen = !this.panelOpen;
    },

    /** Mark welcome as seen */
    markWelcomeSeen() {
      this.hasSeenWelcome = true;
      this._persist();
    },

    /** Update widget position (drag) */
    updatePosition(x: number, y: number) {
      this.position = { x, y };
      this._persist();
    },

    /** Reset all progress */
    resetAll() {
      this.completedSteps = [];
      this.completedMissions = [];
      this.activeMissionId = null;
      this.currentStepIndex = 0;
      this.hasSeenWelcome = false;
      this._persist();
    },

    // ─── Internal ───

    _finishMission() {
      if (this.activeMissionId && !this.completedMissions.includes(this.activeMissionId)) {
        this.completedMissions.push(this.activeMissionId);
        this.completionDates[this.activeMissionId] = new Date().toISOString();
      }
    },

    _persist() {
      saveState(this.$state);
    },
  },
});

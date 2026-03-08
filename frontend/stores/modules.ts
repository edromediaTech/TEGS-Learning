import { defineStore } from 'pinia';

export type BlockType =
  | 'text' | 'media' | 'quiz'
  | 'heading' | 'separator' | 'image' | 'text_image' | 'video' | 'audio' | 'pdf' | 'embed'
  | 'true_false' | 'numeric' | 'fill_blank' | 'matching' | 'sequence' | 'likert';

export interface ContentBlock {
  _id?: string;
  type: BlockType;
  order: number;
  data: any;
}

export interface Screen {
  _id?: string;
  title: string;
  order: number;
  contentBlocks?: ContentBlock[];
}

export interface Section {
  _id?: string;
  title: string;
  order: number;
  screens: Screen[];
}

export type ThemeId = 'ddene' | 'nature' | 'contrast' | 'ocean' | 'sunset';

export interface Module {
  _id: string;
  title: string;
  description: string;
  language: string;
  coverImage: string;
  status: string;
  theme: ThemeId;
  shareToken: string | null;
  shareEnabled: boolean;
  sections: Section[];
  tenant_id: string;
  created_by: string;
  createdAt: string;
  updatedAt: string;
}

interface ScreenDetail {
  screen: Screen;
  sectionTitle: string;
  moduleTitle: string;
  moduleId: string;
}

interface ModulesState {
  modules: Module[];
  current: Module | null;
  currentScreen: ScreenDetail | null;
  loading: boolean;
  error: string | null;
}

export const useModulesStore = defineStore('modules', {
  state: (): ModulesState => ({
    modules: [],
    current: null,
    currentScreen: null,
    loading: false,
    error: null,
  }),

  actions: {
    _headers() {
      const token = useCookie('auth_token').value;
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
    },

    _baseURL() {
      return useRuntimeConfig().public.apiBase as string;
    },

    async fetchModules() {
      this.loading = true;
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules`, {
          headers: this._headers(),
        });
        this.modules = res.modules;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de chargement';
      } finally {
        this.loading = false;
      }
    },

    async fetchModule(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules/${id}`, {
          headers: this._headers(),
        });
        this.current = res.module;
      } catch (err: any) {
        this.error = err.data?.error || 'Module introuvable';
      } finally {
        this.loading = false;
      }
    },

    async createModule(data: { title: string; description?: string; language?: string }) {
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules`, {
          method: 'POST',
          headers: this._headers(),
          body: data,
        });
        this.modules.unshift(res.module);
        return res.module;
      } catch (err: any) {
        this.error = err.data?.error || err.data?.errors?.[0]?.msg || 'Erreur de creation';
        throw err;
      }
    },

    async updateModule(id: string, data: Partial<Module>) {
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules/${id}`, {
          method: 'PUT',
          headers: this._headers(),
          body: data,
        });
        const idx = this.modules.findIndex((m) => m._id === id);
        if (idx !== -1) this.modules[idx] = res.module;
        if (this.current?._id === id) this.current = res.module;
        return res.module;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de mise a jour';
        throw err;
      }
    },

    async deleteModule(id: string) {
      this.error = null;
      try {
        await $fetch<any>(`${this._baseURL()}/modules/${id}`, {
          method: 'DELETE',
          headers: this._headers(),
        });
        this.modules = this.modules.filter((m) => m._id !== id);
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de suppression';
        throw err;
      }
    },

    async updateStructure(id: string, sections: Section[]) {
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules/${id}/structure`, {
          method: 'PUT',
          headers: this._headers(),
          body: { sections },
        });
        if (this.current?._id === id) this.current = res.module;
        const idx = this.modules.findIndex((m) => m._id === id);
        if (idx !== -1) this.modules[idx] = res.module;
        return res.module;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de mise a jour de la structure';
        throw err;
      }
    },

    async fetchScreen(moduleId: string, screenId: string) {
      this.loading = true;
      this.error = null;
      try {
        const res = await $fetch<any>(
          `${this._baseURL()}/modules/${moduleId}/screens/${screenId}`,
          { headers: this._headers() }
        );
        this.currentScreen = res;
      } catch (err: any) {
        this.error = err.data?.error || 'Ecran introuvable';
      } finally {
        this.loading = false;
      }
    },

    async toggleShare(moduleId: string, enabled: boolean) {
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules/${moduleId}/share`, {
          method: 'POST',
          headers: this._headers(),
          body: { enabled },
        });
        return res;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de partage';
        throw err;
      }
    },

    async getShareInfo(moduleId: string) {
      this.error = null;
      try {
        const res = await $fetch<any>(`${this._baseURL()}/modules/${moduleId}/share`, {
          headers: this._headers(),
        });
        return res;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur';
        throw err;
      }
    },

    async saveScreenContent(moduleId: string, screenId: string, contentBlocks: ContentBlock[]) {
      this.error = null;
      try {
        const res = await $fetch<any>(
          `${this._baseURL()}/modules/${moduleId}/screens/${screenId}/content`,
          {
            method: 'PUT',
            headers: this._headers(),
            body: { contentBlocks },
          }
        );
        if (this.currentScreen) {
          this.currentScreen.screen = res.screen;
        }
        return res.screen;
      } catch (err: any) {
        this.error = err.data?.error || 'Erreur de sauvegarde du contenu';
        throw err;
      }
    },
  },
});

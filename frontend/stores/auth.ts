import { defineStore } from 'pinia';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenant_id: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tenant_id: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    tenant_id: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isSuperAdmin: (state) => state.user?.role === 'superadmin',
    isAdmin: (state) => state.user?.role === 'admin_ddene' || state.user?.role === 'superadmin',
    isTeacher: (state) => state.user?.role === 'teacher',
    canManageModules: (state) =>
      ['superadmin', 'admin_ddene', 'teacher'].includes(state.user?.role || ''),
    fullName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
  },

  actions: {
    async login(email: string, password: string, tenant_id?: string) {
      const config = useRuntimeConfig();
      const body: any = { email, password };
      if (tenant_id) body.tenant_id = tenant_id;

      const res = await $fetch<any>(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body,
      });

      this.user = res.user;
      this.token = res.token;
      this.tenant_id = res.user.tenant_id || null;

      const tokenCookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
      tokenCookie.value = res.token;

      const tenantCookie = useCookie('tenant_id', { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });
      tenantCookie.value = res.user.tenant_id || '';
    },

    async fetchMe() {
      const token = useCookie('auth_token').value;
      if (!token) return;

      // Decoder le JWT pour obtenir les infos de base (fonctionne SSR + client)
      const decodeToken = (t: string) => {
        try {
          const payload = JSON.parse(atob(t.split('.')[1]));
          return {
            id: payload.id || payload.sub || '',
            role: payload.role || '',
            tenant_id: payload.tenant_id || '',
            email: payload.email || '',
            firstName: payload.firstName || '',
            lastName: payload.lastName || '',
          };
        } catch {
          return null;
        }
      };

      // SSR: decoder le token, pas d'appel backend
      if (import.meta.server) {
        this.token = token;
        this.tenant_id = useCookie('tenant_id').value || null;
        const decoded = decodeToken(token);
        if (decoded) this.user = decoded;
        return;
      }

      // Client: d'abord restaurer depuis le JWT pour eviter le flash de login
      if (!this.token) {
        this.token = token;
        this.tenant_id = useCookie('tenant_id').value || null;
        const decoded = decodeToken(token);
        if (decoded) this.user = decoded;
      }

      // Puis verifier avec le backend en arriere-plan (non-bloquant)
      const config = useRuntimeConfig();
      try {
        const res = await $fetch<any>(`${config.public.apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.user = res.user;
        this.token = token;
        this.tenant_id = res.user.tenant_id;
      } catch (err: any) {
        // Seulement logout si le token est explicitement rejete (401)
        if (err?.response?.status === 401 || err?.status === 401) {
          this.logout();
        }
        // Sinon (erreur reseau, 500, etc.) : garder la session JWT
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.tenant_id = null;
      const tokenCookie = useCookie('auth_token');
      tokenCookie.value = null;
      const tenantCookie = useCookie('tenant_id');
      tenantCookie.value = null;
      navigateTo('/login');
    },
  },
});

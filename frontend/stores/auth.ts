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
    isAdmin: (state) => state.user?.role === 'admin_ddene',
    isTeacher: (state) => state.user?.role === 'teacher',
    canManageModules: (state) =>
      state.user?.role === 'admin_ddene' || state.user?.role === 'teacher',
    fullName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : '',
  },

  actions: {
    async login(email: string, password: string, tenant_id: string) {
      const config = useRuntimeConfig();
      const res = await $fetch<any>(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body: { email, password, tenant_id },
      });

      this.user = res.user;
      this.token = res.token;
      this.tenant_id = tenant_id;

      const tokenCookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 });
      tokenCookie.value = res.token;

      const tenantCookie = useCookie('tenant_id', { maxAge: 60 * 60 * 24 });
      tenantCookie.value = tenant_id;
    },

    async fetchMe() {
      const config = useRuntimeConfig();
      const token = useCookie('auth_token').value;
      if (!token) return;

      try {
        const res = await $fetch<any>(`${config.public.apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.user = res.user;
        this.token = token;
        this.tenant_id = res.user.tenant_id;
      } catch {
        this.logout();
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

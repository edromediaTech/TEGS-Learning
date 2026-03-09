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

// Firebase Hosting only forwards the __session cookie to Cloud Run SSR.
const SESSION_COOKIE = '__session';
const COOKIE_OPTS = { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' as const };

function getSessionCookie() {
  return useCookie<{ token: string; tenant_id: string } | null>(SESSION_COOKIE, COOKIE_OPTS);
}

function decodeJwt(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
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

      // Save to __session cookie (the only cookie Firebase Hosting forwards)
      const session = getSessionCookie();
      session.value = { token: res.token, tenant_id: res.user.tenant_id || '' };
    },

    async fetchMe() {
      // Read from __session cookie
      const session = getSessionCookie();
      let token: string | null = null;
      let tenantId: string = '';

      if (session.value && session.value.token) {
        token = session.value.token;
        tenantId = session.value.tenant_id || '';
      }

      // Fallback: try legacy cookies
      if (!token) {
        const legacyToken = useCookie('auth_token').value;
        if (legacyToken) {
          token = legacyToken;
          tenantId = useCookie('tenant_id').value || '';
          // Migrate to __session
          session.value = { token, tenant_id: tenantId };
        }
      }

      if (!token) return;

      // SSR: decode token, no backend call
      if (import.meta.server) {
        this.token = token;
        this.tenant_id = tenantId || null;
        const decoded = decodeJwt(token);
        if (decoded) this.user = decoded;
        return;
      }

      // Client: restore from JWT immediately to prevent login flash
      if (!this.token) {
        this.token = token;
        this.tenant_id = tenantId || null;
        const decoded = decodeJwt(token);
        if (decoded) this.user = decoded;
      }

      // Then verify with backend
      const config = useRuntimeConfig();
      try {
        const res = await $fetch<any>(`${config.public.apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.user = res.user;
        this.token = token;
        this.tenant_id = res.user.tenant_id;
      } catch (err: any) {
        // Only logout on explicit 401
        if (err?.response?.status === 401 || err?.status === 401) {
          this.logout();
        }
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.tenant_id = null;
      const session = getSessionCookie();
      session.value = null;
      // Clear legacy cookies too
      useCookie('auth_token').value = null;
      useCookie('tenant_id').value = null;
      navigateTo('/login');
    },
  },
});

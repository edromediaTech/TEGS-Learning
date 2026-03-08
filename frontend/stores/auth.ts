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
// We store { token, tenant_id } as JSON inside __session.
const SESSION_COOKIE = '__session';
const COOKIE_OPTS = { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' as const };

function readSession(): { token: string; tenant_id: string } | null {
  const raw = useCookie(SESSION_COOKIE).value;
  if (!raw) return null;
  try {
    // Could be JSON or a plain token string (backwards compat)
    if (typeof raw === 'string' && raw.startsWith('{')) {
      return JSON.parse(raw);
    }
    // Plain JWT token (old format)
    if (typeof raw === 'string' && raw.includes('.')) {
      return { token: raw, tenant_id: '' };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSession(token: string, tenant_id: string) {
  const cookie = useCookie(SESSION_COOKIE, COOKIE_OPTS);
  cookie.value = JSON.stringify({ token, tenant_id });
}

function clearSession() {
  const cookie = useCookie(SESSION_COOKIE);
  cookie.value = null;
  // Also clear legacy cookies
  const legacyToken = useCookie('auth_token');
  legacyToken.value = null;
  const legacyTenant = useCookie('tenant_id');
  legacyTenant.value = null;
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

      writeSession(res.token, res.user.tenant_id || '');
    },

    async fetchMe() {
      // Read from __session cookie (Firebase-compatible)
      let session = readSession();

      // Fallback: try legacy cookies
      if (!session) {
        const legacyToken = useCookie('auth_token').value;
        if (legacyToken) {
          const legacyTenant = useCookie('tenant_id').value || '';
          session = { token: legacyToken, tenant_id: legacyTenant };
          // Migrate to __session
          writeSession(legacyToken, legacyTenant);
        }
      }

      if (!session?.token) return;
      const token = session.token;

      // Decode JWT for basic user info (works SSR + client)
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

      // SSR: decode token, no backend call
      if (import.meta.server) {
        this.token = token;
        this.tenant_id = session.tenant_id || null;
        const decoded = decodeToken(token);
        if (decoded) this.user = decoded;
        return;
      }

      // Client: restore from JWT immediately to prevent login flash
      if (!this.token) {
        this.token = token;
        this.tenant_id = session.tenant_id || null;
        const decoded = decodeToken(token);
        if (decoded) this.user = decoded;
      }

      // Then verify with backend (non-blocking)
      const config = useRuntimeConfig();
      try {
        const res = await $fetch<any>(`${config.public.apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.user = res.user;
        this.token = token;
        this.tenant_id = res.user.tenant_id;
      } catch (err: any) {
        // Only logout on explicit 401 (token rejected)
        if (err?.response?.status === 401 || err?.status === 401) {
          this.logout();
        }
        // Network errors, 500, etc.: keep JWT session alive
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.tenant_id = null;
      clearSession();
      navigateTo('/login');
    },
  },
});

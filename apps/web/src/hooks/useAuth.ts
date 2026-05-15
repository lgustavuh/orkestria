import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<{ requiresMfa?: boolean }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  isClient: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password, mfaCode) => {
    const res = await api.login(email, password, mfaCode);
    if (res.requiresMfa) return { requiresMfa: true };
    api.setTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, isAuthenticated: true, isLoading: false });
    return {};
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      api.loadTokens();
      if (!api.getAccessToken()) { set({ isLoading: false }); return; }
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  isClient: () => get().user?.roles.includes('CLIENT') ?? false,
  hasRole: (role) => get().user?.roles.includes(role) ?? false,
}));

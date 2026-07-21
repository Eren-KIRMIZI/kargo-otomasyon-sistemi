import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  role: string;
  customer_profile_id: number | null;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
  isInitializing: boolean;
  login: (token: string) => void;
  logout: () => void;
  /**
   * fetchUser: /me endpoint'inden kullanıcı bilgisini çeker.
   * tokenOverride ile doğrudan token gönderilebilir (interceptor'a gerek kalmaz).
   * Hata olursa store'u temizler ve hatayı fırlatır.
   */
  fetchUser: (tokenOverride?: string) => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  user: null,
  isInitializing: true,

  login: (token: string) => {
    localStorage.setItem('token', token);
    sessionStorage.removeItem('token');
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    set({ token: null, isAuthenticated: false, user: null });
  },

  fetchUser: async (tokenOverride?: string) => {
    const effectiveToken = tokenOverride ?? localStorage.getItem('token');
    try {
      // api instance kullan — CORS ve base URL tutarlı kalır
      // Authorization header'ı doğrudan ekle — interceptor'a bağımlı değil
      const response = await api.get('/auth/me', {
        headers: effectiveToken
          ? { Authorization: `Bearer ${effectiveToken}` }
          : {},
      });
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null });
      throw error;
    }
  },

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false });
      return;
    }
    try {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: response.data, isAuthenticated: true, isInitializing: false });
    } catch {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null, isInitializing: false });
    }
  },
}));


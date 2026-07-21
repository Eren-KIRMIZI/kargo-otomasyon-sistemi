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

    // Backend henüz açılmamış olabilir (uygulama ilk başladığında race condition)
    // 401 dışındaki hatalarda token'ı silme — sadece retry yap
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1200;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ user: response.data, isAuthenticated: true, isInitializing: false });
        return; // başarı
      } catch (err: any) {
        const status = err.response?.status;

        if (status === 401) {
          // Token gerçekten geçersiz — sil ve çık
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          set({ token: null, isAuthenticated: false, user: null, isInitializing: false });
          return;
        }

        // Ağ hatası veya backend henüz hazır değil (502, 503, network error)
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          // bir sonraki attempt'e devam
        } else {
          // Son deneme de başarısız — token'ı silme, sadece initialized yap
          // Kullanıcı login ekranını görür ama token kaybolmaz
          set({ isAuthenticated: false, isInitializing: false });
        }
      }
    }
  },
}));


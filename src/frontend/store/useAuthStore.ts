import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  emailVerified: boolean;

  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateFromToken: (accessToken: string) => void;
}

function parseJwtPayload(token: string): Record<string, string> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  emailVerified: false,

  login: (accessToken, _refreshToken) => {
    const payload = parseJwtPayload(accessToken);
    if (!payload) return;

    set({
      user: { id: payload['sub'], email: payload['email'], role: payload['role'] },
      accessToken,
      isAuthenticated: true,
      emailVerified: payload['email_verified'] === 'true',
    });
  },

  logout: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    emailVerified: false,
  }),

  updateFromToken: (accessToken) => {
    const payload = parseJwtPayload(accessToken);
    if (!payload) return;

    set((state) => ({
      ...state,
      accessToken,
      emailVerified: payload['email_verified'] === 'true',
      user: { id: payload['sub'], email: payload['email'], role: payload['role'] },
    }));
  },
}));

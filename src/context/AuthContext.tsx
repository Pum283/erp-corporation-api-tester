import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/services';
import { clearAuth, getRefreshToken, getStoredUser, getToken, saveAuth } from '../lib/storage';
import { normalizeUser } from '../lib/normalizeUser';
import type { UserDto } from '../types/entities';

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    const profile = await authApi.me();
    setUser(normalizeUser(profile));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (getToken()) await refreshProfile();
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    saveAuth(res.token, res.refreshToken, {
      userId: res.userId,
      fullName: res.fullName,
      employeeCode: res.employeeCode,
    });
    const profile = await authApi.me();
    setUser(normalizeUser(profile));
  }, []);

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.revoke(rt);
      } catch {
        /* ignore */
      }
    }
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user && !!getToken(),
      login,
      logout,
      refreshProfile,
    }),
    [user, loading, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useStoredIdentity() {
  return getStoredUser();
}

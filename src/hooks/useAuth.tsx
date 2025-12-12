import { useState, useEffect, createContext, useContext } from 'react';
import { apiFetch, setAccessToken, getAccessToken } from '@/integrations/apiClient';

interface AuthContextType {
  user: any | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Look for access_token in URL (query string or hash) — useful for OAuth redirects
    try {
      const url = new URL(window.location.href);
      // check query param first
      let tokenFromUrl = url.searchParams.get('access_token');
      // fallback: some providers return token in hash fragment `#access_token=...`
      if (!tokenFromUrl && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        tokenFromUrl = params.get('access_token');
      }

      if (tokenFromUrl) {
        setAccessToken(tokenFromUrl);
        setToken(tokenFromUrl);
        try {
          const payload = JSON.parse(atob(tokenFromUrl.split('.')[1]));
          setUser({ id: payload.sub || payload.id, email: payload.email, ...payload });
        } catch {
          setUser(null);
        }
        // Remove token from URL (clean up)
        try {
          // remove access_token from query
          url.searchParams.delete('access_token');
          // also remove hash entirely
          window.history.replaceState({}, document.title, url.pathname + url.search);
        } catch {}
        setLoading(false);
        return;
      }

      // 2) Otherwise, read token from localStorage
      const t = getAccessToken();
      if (t) {
        setToken(t);
        try {
          const payload = JSON.parse(atob(t.split('.')[1]));
          setUser({ id: payload.sub || payload.id, email: payload.email, ...payload });
        } catch {
          setUser(null);
        }
      }
    } catch (err) {
      // ignore parsing errors
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiFetch('/oauth2/login', { method: 'POST', body: JSON.stringify({ username: email, password }) });
      const token = data?.access_token || data?.token || null;
      if (token) {
        setAccessToken(token);
        setToken(token);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ id: payload.sub, email: payload.email, ...payload });
        } catch {
          setUser(null);
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await apiFetch('/oauth2/signup', { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName }) });
      const token = data?.access_token || data?.token || null;
      if (token) {
        setAccessToken(token);
        setToken(token);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ id: payload.sub, email: payload.email, ...payload });
        } catch {
          setUser(null);
        }
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    // Redirect browser to backend google auth endpoint which will forward to provider
    window.location.href = `${(import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000'}/google/login`;
  };

  const signInWithMicrosoft = async () => {
    window.location.href = `${(import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000'}/microsoft/login`;
  };

  const signOut = async () => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
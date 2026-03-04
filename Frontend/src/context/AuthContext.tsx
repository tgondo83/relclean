import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "manager" | "user";
  status: "active" | "inactive";
  permissions?: {
    pages: string[];
    actions: string[];
  };
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (data: { username: string; email: string; password: string; role?: string }) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "reliable_auth_token";
const USER_KEY = "reliable_auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          // Token invalid — clear
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        }
      } catch {
        // Network error — keep stored state, assume valid
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Listen for 401 events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || "Login failed" };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return {};
    } catch (error) {
      return { error: "Network error. Please check your connection." };
    }
  }, []);

  const register = useCallback(async (regData: { username: string; email: string; password: string; role?: string }): Promise<{ error?: string }> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(regData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || "Registration failed" };
      }

      // If registering yourself (no existing auth), auto-login
      if (!token) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return {};
    } catch (error) {
      return { error: "Network error. Please check your connection." };
    }
  }, [token]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem("branch_session_confirmed");
    // Let BranchContext (and others) know so they can reset their state
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Returns a checker function: hasPermission("orders") or hasPermission("create-order").
 * Admin / Manager always pass. Unauthenticated users always fail.
 */
export const usePermission = () => {
  const { user } = useAuth();
  return (key: string): boolean => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "manager") return true;
    return (
      (user.permissions?.pages.includes(key) ?? false) ||
      (user.permissions?.actions.includes(key) ?? false)
    );
  };
};


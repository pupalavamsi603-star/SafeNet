import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { clearTokens } from "../lib/nativeAuth";

const AuthContext = createContext(null);

function clearChatSessions() {
  Object.keys(localStorage)
    .filter((key) => key === "safenet-chat-session" || key.startsWith("safenet-chat-session:"))
    .forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(false))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    clearChatSessions();
    // Also drop the native bearer tokens even if the request above failed, so a
    // logout with no connectivity still logs the device out. No-op on web.
    clearTokens();
    setUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "../services/api.js";

/*
  Admin session state. The session itself lives in an httpOnly cookie the browser
  sends automatically — this context only tracks whether that cookie is currently
  valid, which it learns by asking the server.
*/

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then((data) => {
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    setUser(data.user);
    setStatus("authenticated");
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Whatever the server said, this browser is done with the session.
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(() => ({ user, status, signIn, signOut }), [user, status, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

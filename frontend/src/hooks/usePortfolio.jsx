import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getPortfolio } from "../services/api.js";

/*
  Every piece of content on the public site comes from one request to
  /api/portfolio. Sections read what they need from here; none of them own copy.
*/

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, status: "loading" }));

    getPortfolio(controller.signal)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ status: "error", data: null, error });
      });

    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <PortfolioContext.Provider value={{ ...state, reload }}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used inside <PortfolioProvider>");
  return context;
}

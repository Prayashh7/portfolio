import { useCallback, useEffect, useRef, useState } from "react";

/*
  Load something, keep it, reload it after a change. Every dashboard screen does
  exactly this, so it lives here once.

  The loader is held in a ref so a fresh closure on every render does not restart
  the request; `deps` decides when to load again.
*/
export function useAsync(load, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(async (signal) => {
    try {
      const data = await loader.current(signal);
      if (!signal?.aborted) setState({ status: "ready", data, error: null });
    } catch (error) {
      if (error.name === "AbortError") return;
      setState({ status: "error", data: null, error });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => (current.status === "ready" ? current : { ...current, status: "loading" }));
    run(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(), [run]);

  return { ...state, reload };
}

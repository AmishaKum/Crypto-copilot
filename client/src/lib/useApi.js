import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** GET `path` (skip when null). Keeps the last good data on refresh errors. */
export function useApi(path, { refreshMs } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const alive = useRef(true);
  const load = useCallback(() => {
    if (!path) return;
    api(path)
      .then((data) => alive.current && setState({ data, error: null, loading: false }))
      .catch((error) => alive.current && setState((s) => ({ ...s, error, loading: false })));
  }, [path]);
  useEffect(() => {
    alive.current = true;
    setState((s) => ({ ...s, loading: !!path }));
    load();
    const t = refreshMs && setInterval(load, refreshMs);
    return () => { alive.current = false; clearInterval(t); };
  }, [load, refreshMs, path]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}

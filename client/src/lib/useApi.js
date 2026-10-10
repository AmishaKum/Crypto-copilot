import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useApi(path, refreshMs) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    api(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((e) => setState((s) => ({ ...s, error: e.message, loading: false })));
  }, [path]);
  useEffect(() => {
    load();
    if (!refreshMs) return;
    const t = setInterval(load, refreshMs);
    return () => clearInterval(t);
  }, [load, refreshMs]);
  return { ...state, reload: load };
}

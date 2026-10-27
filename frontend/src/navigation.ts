import { useEffect, useState } from 'react';

export const routePaths: Record<string, string> = {
  overview: '/calculator', optimize: '/optimization',
  sensitivity: '/comparison', policy: '/policies', project: '/help',
};
function currentRoute() {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.hash.slice(1).split('?')[0];
  return Object.keys(routePaths).find((key) => routePaths[key] === path) ?? 'overview';
}
export function useRoute(): [string, (page: string) => void] {
  const [page, setPage] = useState(currentRoute);
  useEffect(() => {
    const normalizeLegacy = () => {
      if (window.location.hash.split('?')[0] === '#/repayment') window.history.replaceState(null, '', '#/calculator');
    };
    normalizeLegacy();
    const change = () => { normalizeLegacy(); setPage(currentRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change);
    if (!window.location.hash) window.history.replaceState(null, '', '#/calculator');
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return [page, (next) => {
    const [key, query] = next.split('?');
    window.location.hash = `${routePaths[key] ?? routePaths.overview}${query ? `?${query}` : ''}`;
    setPage(key in routePaths ? key : 'overview');
    window.scrollTo(0, 0);
  }];
}

/** Session-scoped financial workspace, never written to the server database. */
export function useSessionState<T>(key: string, initial: T) {
  const storageKey = `homewise.v2.${key}`;
  const [value, setValue] = useState<T>(() => {
    try { const text = sessionStorage.getItem(storageKey); return text ? JSON.parse(text) as T : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try {
      if (value === undefined) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch { /* Private browsing or a full quota leaves the in-memory workspace usable. */ }
  }, [storageKey, value]);
  return [value, setValue] as const;
}

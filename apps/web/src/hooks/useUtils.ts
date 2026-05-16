import { useState, useEffect, useCallback } from 'react';

/**
 * Debounce a value - useful for search inputs.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Pagination state management.
 */
export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const next = useCallback(() => {
    if (hasNext) setPage(p => p + 1);
  }, [hasNext]);

  const prev = useCallback(() => {
    if (hasPrev) setPage(p => p - 1);
  }, [hasPrev]);

  const reset = useCallback(() => setPage(1), []);

  return { page, limit, total, totalPages, hasNext, hasPrev, next, prev, reset, setTotal };
}

/**
 * Generic async data fetcher with loading/error states.
 */
export function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}

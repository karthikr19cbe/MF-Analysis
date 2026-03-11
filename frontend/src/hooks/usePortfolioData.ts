import { useState, useEffect, useCallback } from 'react';
import type { PortfolioData } from '../types/portfolio';

interface UsePortfolioDataReturn {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePortfolioData(): UsePortfolioDataReturn {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/data/consolidated.json?' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      const json: PortfolioData = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

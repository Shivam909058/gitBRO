import { useState } from 'react';
import { analyzeRepository, getAnalyses } from '../lib/api';

export const useAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (repoName: string, files: Array<{ path: string; content: string }>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeRepository(repoName, files);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const analyses = await getAnalyses();
      return analyses;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    analyze,
    fetchAnalyses,
    loading,
    error
  };
};
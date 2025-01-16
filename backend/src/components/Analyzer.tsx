import { useAnalysis } from '../hooks/useAnalysis';

export default function Analyzer() {
  const { analyze, loading, error } = useAnalysis();

  const handleAnalyze = async (files: Array<{ path: string; content: string }>) => {
    try {
      const result = await analyze('repo-name', files);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {loading && <div>Analyzing...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {/* Your existing UI components */}
    </div>
  );
}
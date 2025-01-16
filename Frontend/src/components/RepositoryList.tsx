import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { RepositoryAnalyzer } from './RepositoryAnalyzer';
import { LoginButton } from './LoginButton';
import { GitBranch, Loader2 } from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  description: string | null;
  url: string;
  defaultBranch: string;
}

export function RepositoryList() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndFetchRepos();
  }, []);

  const checkAuthAndFetchRepos = async () => {
    try {
      setLoading(true);
      // First check authentication
      const authResponse = await api.get('/auth/status');
      console.log('Auth response:', authResponse.data);
      
      if (authResponse.data.authenticated) {
        setIsAuthenticated(true);
        // Then fetch repositories
        const repoResponse = await api.get('/api/repositories');
        console.log('Repository response:', repoResponse.data);
        setRepositories(repoResponse.data);
      } else {
        setError('Please login first');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 p-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Your Repositories</h2>
        {!isAuthenticated && <LoginButton />}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          Error: {error}
        </div>
      ) : !isAuthenticated ? (
        <div className="p-8 text-center bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <p className="text-gray-300">Please login to view your repositories</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="p-8 text-center bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <p className="text-gray-300">No repositories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {repositories.map((repo) => (
            <div 
              key={repo.id} 
              className="p-6 bg-gray-800/80 rounded-lg border border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] hover:bg-gray-800/90"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl text-white">{repo.name}</h3>
                  {repo.description && (
                    <p className="text-gray-400 mt-2">{repo.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <GitBranch className="w-4 h-4" />
                  <span className="text-sm">{repo.defaultBranch}</span>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <a 
                  href={repo.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-colors duration-200"
                >
                  View on GitHub
                </a>
                <button
                  onClick={() => setSelectedRepo(repo)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Analyze Code
                </button>
              </div>

              {selectedRepo?.id === repo.id && (
                <div className="mt-6 animate-fade-in-up">
                  <RepositoryAnalyzer repository={repo} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
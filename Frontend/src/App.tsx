import { RepositoryList } from './components/RepositoryList';
import { GithubIcon } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-black/30 backdrop-blur-sm shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex items-center space-x-4">
            <GithubIcon className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              GIT-AI
            </h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RepositoryList />
      </main>
    </div>
  );
}

export default App;
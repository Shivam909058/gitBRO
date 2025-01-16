import { GithubIcon } from 'lucide-react';

export function LoginButton() {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
  };

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2 shadow-xl"
    >
      <GithubIcon className="w-5 h-5" />
      <span>Login with GitHub</span>
    </button>
  );
} 
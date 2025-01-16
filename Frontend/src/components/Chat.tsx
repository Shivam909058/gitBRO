import { useState, useEffect } from 'react';
import { getRepositories, selectRepository, sendContextualChatMessage } from '../lib/api';

export function Chat() {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const repos = await getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  };

  const handleRepoSelect = async (repoName) => {
    try {
      const result = await selectRepository(repoName);
      setSelectedRepo(result);
    } catch (error) {
      console.error('Failed to select repository:', error);
    }
  };

  const handleSendMessage = async () => {
    try {
      const context = selectedRepo ? {
        repoName: selectedRepo.name,
        action: message.toLowerCase().includes('update') ? 'update' : 
               message.toLowerCase().includes('refine') ? 'refine' : 'analyze'
      } : undefined;

      const response = await sendContextualChatMessage(message, context);
      setChatHistory(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: response.message }]);
      setMessage('');
    } catch (error) {
      console.error('Chat failed:', error);
    }
  };

  return (
    <div>
      {/* Add your JSX here */
      <div>
        <h1>Chat</h1>
      </div>
      }
    </div>
  );
} 
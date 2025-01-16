import { useState } from 'react';
import { api } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCopy, FaCheck, FaPaperPlane, FaSpinner } from 'react-icons/fa';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CodeChange {
  content: string;
  description: string;
}

export function ChatInterface({ file, repository, onApplyChanges }: {
  file: FileContent | null;
  repository: Repository;
  onApplyChanges: (path: string, content: string) => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<CodeChange | null>(null);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [id]: true });
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, [id]: false });
    }, 2000);
  };

  // Custom renderer for code blocks
  const CodeBlock = ({ language, value }: { language: string; value: string }) => (
    <div className="relative group transition-all duration-200 hover:shadow-lg rounded-md">
      <button
        onClick={() => handleCopy(value, value)}
        className="absolute right-2 top-2 p-2 rounded bg-gray-700/90 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-600 transform hover:scale-105"
        title="Copy code"
      >
        {copiedStates[value] ? 
          <FaCheck className="text-green-400" /> : 
          <FaCopy className="text-blue-400" />
        }
      </button>
      <SyntaxHighlighter
        language={language || 'typescript'}
        style={vscDarkPlus}
        customStyle={{ 
          margin: 0,
          borderRadius: '0.375rem',
          padding: '1rem',
          fontSize: '0.9rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        className="rounded-md !bg-gray-900"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );

  const MessageContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          if (inline) {
            return <code className="bg-gray-100 rounded px-1 text-gray-900" {...props}>{children}</code>;
          }
          
          return (
            <CodeBlock
              language={language}
              value={String(children).replace(/\n$/, '')}
            />
          );
        },
        p: ({ children }) => <p className="text-gray-900">{children}</p>,
        li: ({ children }) => <li className="text-gray-900">{children}</li>,
        h1: ({ children }) => <h1 className="text-gray-900 text-2xl font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="text-gray-900 text-xl font-bold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-gray-900 text-lg font-bold">{children}</h3>,
      }}
      className="prose max-w-none dark:prose-invert"
    >
      {content}
    </ReactMarkdown>
  );

  const sendMessage = async () => {
    if (!input.trim() || !file) return;

    try {
      setLoading(true);
      const userMessage = input.trim();
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setInput('');
      setPendingChanges(null);

      const response = await api.post('/api/chat', {
        message: userMessage,
        context: {
          repoName: repository.name,
          filePath: file.path,
          content: file.content,
          action: 'chat'
        }
      });

      const aiResponse = response.data.message;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      // Check for code changes in the response
      const codeMatch = aiResponse.match(/CODE_START\n([\s\S]*?)\nCODE_END/);
      if (codeMatch) {
        const newCode = codeMatch[1];
        const description = aiResponse.split('CODE_START')[0].trim();
        setPendingChanges({
          content: newCode,
          description: description
        });
      }

    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!pendingChanges || !file) return;
    
    const confirmation = window.confirm(
      'Are you sure you want to apply these changes to the file?'
    );
    
    if (confirmation) {
      try {
        await onApplyChanges(file.path, pendingChanges.content);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ Changes applied successfully!'
        }]);
        setPendingChanges(null);
      } catch (error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Failed to apply changes. Please try again.'
        }]);
      }
    }
  };

  if (!file) {
    return <div>Please select a file to start chatting</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-inner">
      <div className="mb-4 p-3 bg-white/80 backdrop-blur rounded-t-lg shadow-sm border-b flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
        <strong className="text-gray-900">Active File:</strong> 
        <span className="text-gray-600 font-mono text-sm truncate">
          {file?.path}
        </span>
      </div>

      <div className="flex-1 overflow-auto mb-4 space-y-4 p-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`transform transition-all duration-300 ease-out ${
              msg.role === 'user'
                ? 'ml-8 slide-in-right'
                : 'mr-8 slide-in-left'
            }`}
          >
            <div className={`p-4 rounded-lg shadow-md ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                : 'bg-white text-gray-900 mr-auto max-w-[80%]'
            }`}>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}
        
        {pendingChanges && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-lg animate-fade-in">
            <h4 className="font-medium text-green-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Suggested Changes
            </h4>
            <p className="mb-3 text-gray-900">
              <MessageContent content={pendingChanges.description} />
            </p>
            <div className="relative group">
              <button
                onClick={() => handleCopy(pendingChanges.content, 'pending-changes')}
                className="absolute right-2 top-2 p-2 rounded bg-gray-700/90 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Copy code"
              >
                {copiedStates['pending-changes'] ? <FaCheck /> : <FaCopy />}
              </button>
              <SyntaxHighlighter
                language={file?.path.split('.').pop() || 'typescript'}
                style={vscDarkPlus}
                customStyle={{ margin: 0 }}
                className="rounded-lg mb-3"
              >
                {pendingChanges.content}
              </SyntaxHighlighter>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 transform hover:scale-105 flex items-center space-x-2 shadow-md"
              >
                <span>Apply Changes</span>
                <FaCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPendingChanges(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2 shadow-md"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md">
              <FaSpinner className="animate-spin text-blue-600" />
              <span className="text-gray-700">Processing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white/80 backdrop-blur rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about the code or request changes..."
            className="flex-1 p-3 border rounded-lg resize-none text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={3}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 h-fit transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-md flex items-center space-x-2"
          >
            <span>Send</span>
            <FaPaperPlane className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCopy, FaCheck } from 'react-icons/fa';

interface AIAnalysis {
  overview: string;
  analysis: string;
  changes: string;
  risks: string;
}

interface FileContent {
  path: string;
  content: string;
  type: string;
}

export function AIAnalysisView({ analysis, file, onApplyChanges }: {
  analysis: AIAnalysis;
  file: FileContent;
  onApplyChanges: (path: string, content: string) => Promise<void>;
}) {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [id]: true });
    setTimeout(() => setCopiedStates({ ...copiedStates, [id]: false }), 2000);
  };

  const CodeBlock = ({ language, value }: { language: string; value: string }) => (
    <div className="relative group transition-all duration-200 hover:shadow-lg rounded-md bg-[#1E1E1E]">
      <button
        onClick={() => handleCopy(value, value)}
        className="absolute right-2 top-2 p-2 rounded bg-gray-700/90 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Copy code"
      >
        {copiedStates[value] ? 
          <FaCheck className="text-green-400" /> : 
          <FaCopy className="text-blue-400" />
        }
      </button>
      <div className="flex items-center px-4 py-2 border-b border-gray-700">
        <span className="text-gray-400 text-sm">{language || 'code'}</span>
      </div>
      <SyntaxHighlighter
        language={language || 'typescript'}
        style={vscDarkPlus}
        customStyle={{ 
          margin: 0,
          padding: '1rem',
          fontSize: '0.9rem',
          backgroundColor: '#1E1E1E',
        }}
        className="!bg-[#1E1E1E]"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );

  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          if (inline) {
            return <code className="bg-gray-800 text-white rounded px-1" {...props}>{children}</code>;
          }
          
          return (
            <CodeBlock
              language={language}
              value={String(children).replace(/\n$/, '')}
            />
          );
        },
        p: ({ children }) => <p className="text-white text-base leading-relaxed mb-4">{children}</p>,
        h1: ({ children }) => <h1 className="text-white text-2xl font-bold mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-white text-xl font-bold mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-white text-lg font-bold mb-2">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside text-white mb-4 space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-white mb-4 space-y-2">{children}</ol>,
        li: ({ children }) => <li className="text-white">{children}</li>,
      }}
      className="prose prose-invert max-w-none"
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="space-y-6 p-4 bg-gray-800/80 rounded-lg">
      <section>
        <h4 className="text-xl font-bold text-white mb-4">Overview</h4>
        <div className="bg-gray-900 rounded-lg p-4 shadow-lg">
          <MarkdownContent content={analysis.overview} />
        </div>
      </section>

      <section>
        <h4 className="text-xl font-bold text-white mb-4">Analysis</h4>
        <div className="bg-gray-900 rounded-lg p-4 shadow-lg">
          <MarkdownContent content={analysis.analysis} />
        </div>
      </section>

      {analysis.changes && (
        <section>
          <h4 className="text-xl font-bold text-white mb-4">Proposed Changes</h4>
          <div className="bg-gray-900 rounded-lg p-4 shadow-lg">
            <MarkdownContent content={analysis.changes} />
            <button
              onClick={() => onApplyChanges(file.path, analysis.changes)}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <span>Apply Changes</span>
              <FaCheck className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {analysis.risks && (
        <section>
          <h4 className="text-xl font-bold text-amber-300 mb-4">Risks & Considerations</h4>
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 shadow-lg">
            <MarkdownContent content={analysis.risks} />
          </div>
        </section>
      )}
    </div>
  );
} 
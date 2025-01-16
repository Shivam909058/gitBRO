import { useState } from 'react';
import { FileTree } from './FileTree';
import { ChatInterface } from './ChatInterface';
import { AIAnalysisView } from './AIAnalysisView';
import { api } from '../lib/api';

interface Repository {
  id: number;
  name: string;
  defaultBranch: string;
}

interface FileContent {
  path: string;
  content: string;
  type: string;
}

interface TreeNode {
  path: string;
  type: 'file' | 'dir';
  content?: string;
  children?: TreeNode[];
}

interface AIAnalysis {
  overview: string;
  analysis: string;
  changes: string;
  risks: string;
}

export function RepositoryAnalyzer({ repository }: { repository: Repository }) {
  const [files, setFiles] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const analyzeRepository = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/analyze', {
        repositoryName: repository.name,
        branch: repository.defaultBranch
      });
      setFiles(response.data.files);
    } catch (error) {
      console.error('Failed to analyze repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAiSuggestions = async (filePath: string, content: string) => {
    try {
      setLoading(true);
      const response = await api.post('/api/chat', {
        message: content,
        context: {
          repoName: repository.name,
          filePath: filePath,
          action: 'analyze'
        }
      });

      // Parse the structured response
      const sections = response.data.message.split(/\n(?=\w+:)/);
      const analysis: AIAnalysis = {
        overview: sections.find(s => s.startsWith('OVERVIEW:'))?.replace('OVERVIEW:', '').trim() || '',
        analysis: sections.find(s => s.startsWith('ANALYSIS:'))?.replace('ANALYSIS:', '').trim() || '',
        changes: sections.find(s => s.startsWith('CHANGES:'))?.replace('CHANGES:', '').trim() || '',
        risks: sections.find(s => s.startsWith('RISKS:'))?.replace('RISKS:', '').trim() || ''
      };

      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFile = async (filePath: string, content: string) => {
    try {
      setLoading(true);
      await api.post('/api/repositories/update', {
        repositoryName: repository.name,
        filePath,
        content,
        message: 'Update code based on AI suggestions'
      });
      // Refresh the file content after update
      if (selectedFile && selectedFile.path === filePath) {
        setSelectedFile({ ...selectedFile, content });
      }
    } catch (error) {
      console.error('Failed to update file:', error);
      alert('Failed to update file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Left Panel - File Tree */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Repository Files</h3>
          <button 
            onClick={analyzeRepository}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Analyze Repository
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-200px)]">
            {files.length > 0 && (
              <FileTree
                files={files}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  getAiSuggestions(file.path, file.content);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Analysis/Chat */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {showChat ? 'Chat' : 'AI Analysis'}
          </h3>
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showChat ? 'Show Analysis' : 'Open Chat'}
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-200px)]">
          {showChat ? (
            <ChatInterface
              file={selectedFile}
              repository={repository}
              onApplyChanges={updateFile}
            />
          ) : (
            selectedFile && aiAnalysis && (
              <AIAnalysisView
                analysis={aiAnalysis}
                file={selectedFile}
                onApplyChanges={updateFile}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
} 
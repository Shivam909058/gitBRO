export interface Repository {
  name: string;
  description: string;
  url: string;
  branch: string;
}

export interface CodeChange {
  filePath: string;
  originalCode: string;
  improvedCode: string;
  explanation: string;
  type: 'improvement' | 'feature' | 'fix';
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface User {
  id: string;
  githubId: string;
  email?: string;
  name?: string;
}

export interface Analysis {
  id: string;
  userId: string;
  repoName: string;
  changes: CodeChange[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
}
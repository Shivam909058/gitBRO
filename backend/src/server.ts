import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';
import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from 'octokit';

// Define types
interface User {
  id: string;
  githubId: string;
  accessToken: string;
  email?: string;
  name?: string;
}

declare module 'express-session' {
  interface SessionData {
    selectedRepo?: string;
  }
}

declare module 'express' {
  interface Request {
    user?: User;
  }
}

type GitHubFileType = 'dir' | 'file' | 'submodule' | 'symlink';

interface GitHubFile {
  path: string;
  content: string;
  type: GitHubFileType;
}

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// CORS configuration 
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// GitHub OAuth setup
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: `${process.env.BACKEND_URL}/auth/github/callback`
  },
  async (accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      const user = await prisma.user.upsert({
        where: { githubId: profile.id },
        update: { accessToken },
        create: {
          githubId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          accessToken
        }
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  }
));

// Auth routes
app.get('/auth/github', passport.authenticate('github', { 
  scope: ['user:email', 'repo']
}));

app.get('/auth/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    successRedirect: process.env.FRONTEND_URL
  })
);

app.get('/auth/status', (req, res) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  
  if (req.user) {
    res.json({ 
      authenticated: true, 
      user: req.user 
    });
  } else {
    res.status(401).json({ 
      authenticated: false 
    });
  }
});

// Add this helper function for generating better prompts
const generateAnalysisPrompt = (filePath: string, content: string) => {
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  return `You are a senior software engineer performing a careful code review. 
You are looking at the file: ${filePath}

Context:
- Language/Framework: ${fileExtension}
- This is production code that needs to be handled with care
- Only suggest changes that are clearly improvements
- Preserve existing functionality and coding style

Current code:
\`\`\`${fileExtension}
${content}
\`\`\`

Please analyze this code and provide:
1. Brief overview of what the code does
2. Potential issues or improvements, if any, considering:
   - Code quality and maintainability
   - Performance optimizations
   - Security concerns
   - Best practices
3. Specific code changes, if needed, with:
   - Clear explanation of why each change is necessary
   - The exact location of the change
   - Before/after code snippets
   - Potential risks or side effects

If no significant improvements are needed, say so - don't suggest changes just for the sake of it.

Format your response as:
OVERVIEW: Brief description of the code
ANALYSIS: Detailed review points
CHANGES: Specific code modifications (if any)
RISKS: Potential risks to consider
`;
};

// Define route handlers
app.post('/api/chat', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { message, context } = req.body;
    let prompt = '';

    if (context?.action === 'chat') {
      prompt = `You are a helpful AI assistant reviewing code. You're looking at the file: ${context.filePath}

Current code:
\`\`\`
${context.content}
\`\`\`

User question/request: ${message}

Please provide a helpful response. If the user requests code changes:
1. Clearly explain what changes you'll make and why
2. Show the exact lines to modify
3. Provide the updated code
4. Mention any potential risks or considerations

If you're suggesting code changes, format them clearly between CODE_START and CODE_END markers.`;
    } else if (context?.action === 'analyze') {
      prompt = generateAnalysisPrompt(context.filePath, message);
    }

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const content = response.content[0];
    const reply = content.type === 'text' ? content.text : '';
    return res.json({ message: reply });
  } catch (error) {
    console.error('Chat failed:', error);
    return res.status(500).json({ error: 'Chat failed' });
  }
});

app.get('/api/repositories', async (req, res) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);

  if (!req.user) {
    console.log('No user found in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const octokit = new Octokit({
      auth: (req.user as User).accessToken
    });

    console.log('Fetching repositories...');
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      affiliation: 'owner,collaborator'
    });
    console.log('Found repositories:', data.length);

    const repositories = data.map(repo => ({
      id: repo.id,
      name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch
    }));

    return res.json(repositories);
  } catch (error) {
    console.error('Repository fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch repositories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/repositories/select', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { repoName } = req.body;
    const octokit = new Octokit({
      auth: (req.user as User).accessToken
    });

    const { data } = await octokit.rest.repos.getContent({
      owner: repoName.split('/')[0],
      repo: repoName.split('/')[1],
      path: ''
    });

    req.session.selectedRepo = repoName;
    res.json({ 
      repoName,
      files: Array.isArray(data) ? data : [data]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to select repository' });
  }
});

app.post('/api/analyze', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { repositoryName, branch } = req.body;
    const octokit = new Octokit({
      auth: (req.user as User).accessToken
    });

    async function fetchDirectoryContent(path: string = ''): Promise<any[]> {
      const { data } = await octokit.rest.repos.getContent({
        owner: repositoryName.split('/')[0],
        repo: repositoryName.split('/')[1],
        path,
        ref: branch
      });

      const contents = Array.isArray(data) ? data : [data];
      const results = [];

      for (const item of contents) {
        if (item.type === 'dir') {
          const subContents = await fetchDirectoryContent(item.path);
          results.push({
            path: item.path,
            type: 'dir',
            children: subContents
          });
        } else if (item.type === 'file') {
          try {
            const fileContent = await octokit.rest.repos.getContent({
              owner: repositoryName.split('/')[0],
              repo: repositoryName.split('/')[1],
              path: item.path,
              ref: branch
            });

            const content = Buffer.from((fileContent.data as any).content, 'base64').toString();
            results.push({
              path: item.path,
              type: 'file',
              content
            });
          } catch (error) {
            console.error(`Error fetching content for ${item.path}:`, error);
          }
        }
      }

      return results;
    }

    console.log('Fetching repository structure...');
    const files = await fetchDirectoryContent();
    console.log('Repository structure fetched successfully');

    return res.json({ files });
  } catch (error) {
    console.error('Analysis failed:', error);
    return res.status(500).json({ error: 'Failed to analyze repository' });
  }
});

app.post('/api/repositories/update', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { repositoryName, filePath, content, message } = req.body;
    const [owner, repo] = repositoryName.split('/');

    const octokit = new Octokit({
      auth: (req.user as User).accessToken
    });

    // Get current file to get its SHA
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath
    });

    // Type guard to ensure we have the SHA
    if (!('sha' in currentFile)) {
      throw new Error('Could not get file SHA');
    }

    // Update file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Update failed:', error);
    return res.status(500).json({ error: 'Failed to update file' });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Validation schemas
const analyzeRequestSchema = z.object({
  repoName: z.string(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string()
  }))
});

router.post('/analyze', requireAuth, async (req, res, next) => {
  try {
    const { repoName, files } = analyzeRequestSchema.parse(req.body);
    const user = req.user as any;

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        repoName,
        status: 'PROCESSING',
        changes: []
      }
    });

    // Process files in parallel with rate limiting
    const processFile = async (file: { path: string; content: string }) => {
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Analyze and improve this code file ${file.path}:\n${file.content}\n\nProvide specific improvements with explanations.`
        }]
      });

      return {
        filePath: file.path,
        suggestions: response.content[0].text,
        type: 'improvement'
      };
    };

    const changes = await Promise.all(
      files.map(processFile)
    );

    const updatedAnalysis = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: 'COMPLETED',
        changes
      }
    });

    res.json(updatedAnalysis);
  } catch (error) {
    next(error);
  }
});

router.get('/analyses', requireAuth, async (req, res, next) => {
  try {
    const user = req.user as any;
    const analyses = await prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(analyses);
  } catch (error) {
    next(error);
  }
});

export default router;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const sdk_1 = require("@anthropic-ai/sdk");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const anthropic = new sdk_1.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const analyzeRequestSchema = zod_1.z.object({
    repoName: zod_1.z.string(),
    files: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        content: zod_1.z.string()
    }))
});
router.post('/analyze', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { repoName, files } = analyzeRequestSchema.parse(req.body);
        const user = req.user;
        const analysis = await prisma_1.prisma.analysis.create({
            data: {
                userId: user.id,
                repoName,
                status: 'PROCESSING',
                changes: []
            }
        });
        const processFile = async (file) => {
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
        const changes = await Promise.all(files.map(processFile));
        const updatedAnalysis = await prisma_1.prisma.analysis.update({
            where: { id: analysis.id },
            data: {
                status: 'COMPLETED',
                changes
            }
        });
        res.json(updatedAnalysis);
    }
    catch (error) {
        next(error);
    }
});
router.get('/analyses', auth_1.requireAuth, async (req, res, next) => {
    try {
        const user = req.user;
        const analyses = await prisma_1.prisma.analysis.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(analyses);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=analysis.js.map
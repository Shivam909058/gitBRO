"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const passport_github2_1 = require("passport-github2");
const client_1 = require("@prisma/client");
const sdk_1 = require("@anthropic-ai/sdk");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
passport_1.default.use(new passport_github2_1.Strategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/github/callback`,
}, async (accessToken, _refreshToken, profile, done) => {
    try {
        const user = await prisma.user.upsert({
            where: { githubId: profile.id },
            update: { accessToken },
            create: {
                githubId: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                accessToken,
            },
        });
        done(null, user);
    }
    catch (error) {
        done(error);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
app.post('/api/analyze', async (req, res) => {
    const { repositoryId, files } = req.body;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const analysis = await prisma.analysis.create({
            data: {
                repoName: repositoryId,
                userId: user.id,
                status: 'PROCESSING',
                changes: []
            }
        });
        const changes = await Promise.all(files.map(async (file) => {
            const response = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                messages: [{
                        role: "user",
                        content: `Analyze and improve this code:\n${file}\n\nProvide specific improvements with explanations.`
                    }]
            });
            return {
                filePath: file,
                improvements: response.content[0].text,
                type: 'improvement'
            };
        }));
        await prisma.analysis.update({
            where: { id: analysis.id },
            data: {
                status: 'COMPLETED',
                changes
            }
        });
        return res.json({ analysisId: analysis.id, changes });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Analysis failed' });
    }
});
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [{
                    role: "user",
                    content: message
                }]
        });
        return res.json({ message: response.content[0].text });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Chat failed' });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map
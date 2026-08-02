import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Server startTime for homelab uptime calculation
const startTime = Date.now();

// Lazy Gemini Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// System / Homelab Health Check API
app.get("/api/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: "healthy",
    appName: "Homelab Spend Tracker",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds,
    memoryUsage: {
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
    },
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Gemini AI Batch Transaction Categorization Endpoint
app.post("/api/categorize/ai", async (req, res) => {
  try {
    const { items, availableCategories } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No transaction items provided." });
    }

    const categoriesList = Array.isArray(availableCategories) && availableCategories.length > 0
      ? availableCategories
      : [
          "Groceries",
          "Dining & Drinks",
          "Housing & Rent",
          "Utilities & Bills",
          "Transportation & Fuel",
          "Subscriptions & Tech",
          "Shopping & Goods",
          "Healthcare & Fitness",
          "Entertainment & Leisure",
          "Income & Salary",
          "Savings & Investment",
          "Miscellaneous",
        ];

    const ai = getGeminiClient();

    const prompt = `You are a financial transaction categorizer. Categorize the following transactions based on their merchant/description text into one of these allowed categories: ${categoriesList.join(", ")}.
    
Transactions to categorize:
${JSON.stringify(items, null, 2)}

Provide a response for each item in the same order with:
1. itemIndex: the index in input
2. originalDescription: exact string
3. category: chosen category from the allowed list
4. cleanedMerchant: human-readable clean merchant name (e.g. "Starbucks", "Uber", "Amazon")
5. confidence: number between 0.0 and 1.0
6. suggestedKeywordRule: a single keyword string to add to keyword auto-categorization rules (e.g. "STARBUCKS", "UBER", "AMZN")`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemIndex: { type: Type.INTEGER },
              originalDescription: { type: Type.STRING },
              category: { type: Type.STRING },
              cleanedMerchant: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              suggestedKeywordRule: { type: Type.STRING },
            },
            required: ["itemIndex", "category", "cleanedMerchant", "confidence"],
          },
        },
      },
    });

    const results = JSON.parse(response.text || "[]");
    return res.json({ success: true, results });
  } catch (error: any) {
    console.error("AI Categorization error:", error);
    return res.status(500).json({
      error: "Failed to categorize with AI",
      details: error.message || String(error),
    });
  }
});

// Server Endpoint to download/fetch Docker Compose & Dockerfile templates
app.get("/api/docker/config", (req, res) => {
  const dockerCompose = `version: '3.8'

services:
  spend-tracker:
    image: homelab/spend-tracker:latest
    container_name: spend-tracker-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
      - HOMELAB_MASTER_PASSWORD=\${HOMELAB_MASTER_PASSWORD:-admin123}
    volumes:
      - spend_data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  spend_data:
    driver: local
`;

  const dockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public 2>/dev/null || true

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
`;

  const envExample = `# Homelab Spend Tracker Configuration
PORT=3000
NODE_ENV=production

# Optional Gemini API Key for AI Auto-Categorization
GEMINI_API_KEY=your_gemini_api_key_here

# Local Master Lock Security
HOMELAB_MASTER_PASSWORD=change_this_password
`;

  res.json({
    dockerCompose,
    dockerfile,
    envExample,
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Homelab Spend Tracker] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

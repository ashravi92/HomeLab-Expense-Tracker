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

// SimpleFIN Bridge API Integration Endpoints

// 1. Claim Setup Token -> Access URL
app.post("/api/simplefin/claim", async (req, res) => {
  try {
    const { claimToken } = req.body;
    if (!claimToken || typeof claimToken !== "string") {
      return res.status(400).json({ error: "Missing or invalid claim token." });
    }

    const tokenInput = claimToken.trim();

    // Support Demo Token
    if (tokenInput.toLowerCase().includes("demo")) {
      return res.json({
        success: true,
        accessUrl: "demo://simplefin-bridge-access-url",
        message: "Demo SimpleFIN connection activated!",
      });
    }

    // Decode setup token if base64 encoded
    let claimUrl = tokenInput;
    if (!tokenInput.startsWith("http://") && !tokenInput.startsWith("https://")) {
      try {
        const decoded = Buffer.from(tokenInput, "base64").toString("utf8").trim();
        if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
          claimUrl = decoded;
        }
      } catch (e) {
        // failed base64 decode, continue with raw input
      }
    }

    if (!claimUrl.startsWith("http://") && !claimUrl.startsWith("https://")) {
      return res.status(400).json({
        error: "Invalid setup token format. Expected a SimpleFIN claim URL or Base64 encoded token.",
      });
    }

    console.log(`[SimpleFIN] Claiming setup token at: ${claimUrl}`);

    // Send POST request to SimpleFIN claim URL
    const response = await fetch(claimUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(response.status).json({
        error: `SimpleFIN claim failed (${response.status}): ${errText || response.statusText}`,
      });
    }

    const accessUrl = (await response.text()).trim();

    if (!accessUrl || (!accessUrl.startsWith("http://") && !accessUrl.startsWith("https://"))) {
      return res.status(500).json({
        error: "SimpleFIN bridge returned an invalid access URL string.",
      });
    }

    return res.json({
      success: true,
      accessUrl,
      message: "SimpleFIN access token claimed successfully!",
    });
  } catch (error: any) {
    console.error("SimpleFIN claim error:", error);
    return res.status(500).json({
      error: "Internal server error while claiming SimpleFIN token",
      details: error.message || String(error),
    });
  }
});

// 2. Fetch Accounts & Transactions using Access URL
app.post("/api/simplefin/accounts", async (req, res) => {
  try {
    let accessUrl = req.body.accessUrl || process.env.SIMPLEFIN_ACCESS_URL;

    if (!accessUrl || typeof accessUrl !== "string") {
      return res.status(400).json({
        error: "No SimpleFIN Access URL provided or set in environment.",
      });
    }

    accessUrl = accessUrl.trim();

    // Demo Mode Simulation
    if (accessUrl.startsWith("demo://")) {
      const now = Math.floor(Date.now() / 1000);
      const daySec = 86400;
      return res.json({
        success: true,
        errors: [],
        accounts: [
          {
            id: "demo-chase-checking",
            name: "Homelab Primary Checking",
            currency: "USD",
            balance: "4850.42",
            "available-balance": "4850.42",
            "balance-date": now,
            org: { name: "Chase Bank", id: "chase" },
            transactions: [
              {
                id: `demo-tx-1`,
                posted: now - daySec * 1,
                amount: "-84.50",
                description: "COSTCO WHOLESALE #108",
                payee: "Costco Wholesale",
                memo: "Groceries & Supplies",
                pending: false,
              },
              {
                id: `demo-tx-2`,
                posted: now - daySec * 2,
                amount: "-14.99",
                description: "HETZNER ONLINE SERVER",
                payee: "Hetzner Cloud",
                memo: "Homelab VPS Hosting",
                pending: false,
              },
              {
                id: `demo-tx-3`,
                posted: now - daySec * 3,
                amount: "2850.00",
                description: "DIRECT DEP TECH CORP SALARY",
                payee: "TechCorp Inc",
                memo: "Payroll Direct Deposit",
                pending: false,
              },
              {
                id: `demo-tx-4`,
                posted: now - daySec * 4,
                amount: "-45.00",
                description: "CLOUDFLARE DOMAIN RENEW",
                payee: "Cloudflare",
                memo: "DNS & Security",
                pending: false,
              },
              {
                id: `demo-tx-5`,
                posted: now - daySec * 5,
                amount: "-12.40",
                description: "STARBUCKS STORE 0841",
                payee: "Starbucks",
                memo: "Morning Coffee",
                pending: false,
              },
            ],
          },
          {
            id: "demo-capone-credit",
            name: "Homelab Sapphire Credit Card",
            currency: "USD",
            balance: "-620.15",
            "available-balance": "9379.85",
            "balance-date": now,
            org: { name: "Capital One", id: "capitalone" },
            transactions: [
              {
                id: `demo-tx-6`,
                posted: now - daySec * 1,
                amount: "-129.99",
                description: "AMAZON.COM* TECH GEAR",
                payee: "Amazon",
                memo: "Cat6 Ethernet Cables & Switch",
                pending: false,
              },
              {
                id: `demo-tx-7`,
                posted: now - daySec * 3,
                amount: "-65.30",
                description: "SHELL OIL 49219482",
                payee: "Shell Gas Station",
                memo: "Fuel",
                pending: false,
              },
            ],
          },
        ],
      });
    }

    // Parse real SimpleFIN Access URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(accessUrl);
    } catch (e) {
      return res.status(400).json({ error: "Malformed SimpleFIN Access URL." });
    }

    const { username, password, origin, pathname } = parsedUrl;
    
    // Construct target /accounts URL
    const basePath = pathname.replace(/\/+$/, "");
    let targetUrl = `${origin}${basePath}/accounts`;

    const queryParams = new URLSearchParams();
    if (req.body.startDate) {
      queryParams.append("start-date", String(req.body.startDate));
    }
    if (req.body.endDate) {
      queryParams.append("end-date", String(req.body.endDate));
    }

    const queryString = queryParams.toString();
    if (queryString) {
      targetUrl += `?${queryString}`;
    }

    console.log(`[SimpleFIN] Fetching accounts from: ${origin}${basePath}/accounts`);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (username || password) {
      const authHeader = Buffer.from(`${decodeURIComponent(username)}:${decodeURIComponent(password)}`).toString("base64");
      headers["Authorization"] = `Basic ${authHeader}`;
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return res.status(response.status).json({
        error: `SimpleFIN API error (${response.status}): ${errText || response.statusText}`,
      });
    }

    const data = await response.json();
    return res.json({
      success: true,
      errors: data.errors || [],
      accounts: data.accounts || [],
    });
  } catch (error: any) {
    console.error("SimpleFIN fetch error:", error);
    return res.status(500).json({
      error: "Internal server error while fetching SimpleFIN bank accounts",
      details: error.message || String(error),
    });
  }
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

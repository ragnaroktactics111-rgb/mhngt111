import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { calculateDamage } from "./src/utils/calculator.js";
import { SKILL_DATA } from "./src/data/skills.js";
import { WEAPONS, BOW_MVS, GL_SHELLING, BOWGUN_MVS, BOW_HITS, BOWGUN_HITS, BOW_TYPE_NAMES, BG_AMMO_NAMES } from "./src/data/constants.js";

import { rateLimit } from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.set("trust proxy", 1);

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mhn-calculator.yourdomain.com" // 將這裡換成你未來的自訂網域
  ];

  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.run.app')) {
        callback(null, true);
      } else {
        callback(new Error('未被授權的網域存取 (CORS Blocked)'));
      }
    }
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  // Set up rate limiter: maximum of 100 requests per 10 minutes
  const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 200, 
    message: { error: "請求過於頻繁，請稍後再試 (Rate Limit Exceeded)" },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  // API routes
  app.get("/api/skills", apiLimiter, (req, res) => {
    res.json(SKILL_DATA);
  });

  app.get("/api/constants", apiLimiter, (req, res) => {
    res.json({
        WEAPONS,
        BOW_MVS,
        GL_SHELLING,
        BOWGUN_MVS,
        BOW_HITS,
        BOWGUN_HITS,
        BOW_TYPE_NAMES,
        BG_AMMO_NAMES
    });
  });

  app.post("/api/calculate", apiLimiter, (req, res) => {
    try {
      const { inputs, selectedSkills, hhBuffsArray } = req.body;
      const hhBuffs = new Set((hhBuffsArray || []) as string[]);
      const results = calculateDamage(inputs, selectedSkills, hhBuffs);
      res.json(results);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

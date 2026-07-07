import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { runIntent } from "./agent.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

const IntentRequestSchema = z.object({
  intentText: z.string().min(1, "Intent text required"),
  policy: z.object({
    agent: z.string(),
    maxAmount: z.string(),
    allowedTarget: z.string(),
    expiry: z.number(),
    revoked: z.boolean(),
    description: z.string().optional(),
  }),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post(
  "/api/intent",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = IntentRequestSchema.parse(req.body);

      const decision = await runIntent(parsed.intentText, parsed.policy);

      res.json({
        success: true,
        decision,
      });
    } catch (err) {
      console.error("[server] Error processing intent:", err);

      if (err instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request format",
          details: err.errors,
        });
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Internal server error";

      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

app.post("/api/demo", (_req: Request, res: Response) => {
  try {
    const demoPath = path.join(__dirname, "../demo-policy.json");
    const policy = JSON.parse(fs.readFileSync(demoPath, "utf-8"));

    res.json({
      demo: true,
      policy,
      nextSteps: [
        'POST /api/intent with intentText: "earn safely on 5 CSPR" and the policy above',
        'POST /api/intent with intentText: "stake 50 CSPR" to test over-limit rejection',
      ],
    });
  } catch (err) {
    console.error("[server] Demo endpoint error:", err);
    res.status(500).json({ error: "Failed to load demo policy" });
  }
});

app.listen(port, () => {
  console.log(
    `[server] Liquid Staking Intent Agent running on http://localhost:${port}`
  );
  console.log(`[server] GET /health - health check`);
  console.log(`[server] POST /api/intent - process intent with policy`);
  console.log(`[server] POST /api/demo - get demo policy`);
});

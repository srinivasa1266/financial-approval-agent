// src/server.js
// Express server — serves the frontend and streams agent events via SSE

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { runApprovalAgent } from "./agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: "claude-sonnet-4-20250514",
    api_key_set: !!process.env.ANTHROPIC_API_KEY,
  });
});

// ─── Main approval endpoint — streams events via SSE ─────────────────────
app.post("/api/approve", async (req, res) => {
  const { vendor, amount, risk_score, role, category, notes, budget } = req.body;

  // Basic validation
  if (!vendor || !amount || risk_score === undefined || !role || !category || !notes || !budget) {
    return res.status(400).json({ error: "Missing required PO fields" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment" });
  }

  // Set up Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (eventType, data) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runApprovalAgent(
      { vendor, amount: parseFloat(amount), risk_score: parseInt(risk_score), role, category, notes, budget: parseFloat(budget) },
      (event) => {
        if (event.type === "step") {
          send("step", { label: event.label, content: event.content, kind: event.kind });
        } else if (event.type === "result") {
          send("result", event);
        }
      }
    );
  } catch (err) {
    send("error", { message: err.message });
  }

  res.end();
});

app.listen(PORT, () => {
  console.log(`\n🤖  Financial Approval Agent running`);
  console.log(`    URL:      http://localhost:${PORT}`);
  console.log(`    API key:  ${process.env.ANTHROPIC_API_KEY ? "✓ set" : "✗ missing — set ANTHROPIC_API_KEY in .env"}`);
  console.log(`    Model:    claude-sonnet-4-20250514\n`);
});

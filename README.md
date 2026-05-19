# Financial Approval Agent

> **Demo project for "Agentic AI Is Powerful — But Who Controls the Decisions?"**
>
> A real-time financial purchase order approval agent powered by Claude, with a 4-layer guardrail architecture, live reasoning trace, and audit logging.

![screenshot](https://img.shields.io/badge/model-claude--sonnet--4--20250514-00C2CB?style=flat-square) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)

---

## What This Demo Shows

- **Real Claude API calls** — actual LLM reasoning, not mocked responses
- **Agentic tool use loop** — Claude calls `erp_lookup`, `vendor_risk_lookup`, and `policy_rag` tools before deciding
- **4-layer guardrail architecture** — injection scan → confidence threshold → risk flags → audit log
- **Server-Sent Events streaming** — watch the agent think step by step in real time
- **Prompt injection detection** — L1 hard block fires before the LLM is ever called

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/financial-approval-agent.git
cd financial-approval-agent
npm install
```

### 2. Set your API key

```bash
cp .env.example .env
# Edit .env and add your Anthropic API key
```

Get your key at [console.anthropic.com](https://console.anthropic.com)

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

### 3. Run

```bash
npm start
# or for auto-reload during development:
npm run dev
```

### 4. Open

```
http://localhost:3000
```

The green dot in the header confirms your API key is set.

---

## Demo Scenarios

Click the preset buttons to load each scenario:

| Preset | What it demonstrates |
|--------|---------------------|
| **Routine supply** | $4,200 office supplies — all guardrails pass, Claude auto-approves |
| **High-value IT** | $145,000 server rack — L1 amount threshold fires, mandatory escalation |
| **Risky vendor** | Risk score 82 — vendor risk threshold exceeded, blocked |
| **Adversarial PO** | Injection attempt in notes — L1 fires before Claude is ever called |

---

## Architecture

```
Browser → POST /api/approve → Guardrail L1 (injection scan)
                                    ↓
                             Claude API (tool-use loop)
                             ├── erp_lookup()
                             ├── vendor_risk_lookup()
                             └── policy_rag()
                                    ↓
                             Claude decision (JSON)
                                    ↓
                             Guardrail L2 (confidence ≥ 0.75?)
                             Guardrail L3 (risk flags)
                             Guardrail L4 (audit log)
                                    ↓
                             SSE stream → Browser (live trace)
```

### Guardrail layers

| Layer | What it does | Where in code |
|-------|-------------|---------------|
| **L1 — Injection scan** | Regex patterns on PO notes; halts pipeline if detected — LLM never called | `agent.js: checkInjection()` |
| **L2 — Confidence threshold** | Overrides APPROVE → ESCALATE if confidence < 0.75 | `agent.js: runApprovalAgent()` |
| **L3 — Risk flag audit** | Surfaces Claude's flagged concerns | `agent.js: runApprovalAgent()` |
| **L4 — Audit log** | Immutable JSON record of every decision | `server.js` → `agent.js` result |

### Project structure

```
financial-approval-agent/
├── src/
│   ├── server.js     # Express server + SSE streaming endpoint
│   └── agent.js      # Core agent: guardrails + Claude tool-use loop
├── public/
│   └── index.html    # Frontend UI (single file, no build step)
├── .env.example
├── package.json
└── README.md
```

---

## Extending the Demo

### Connect real tools
Replace the simulated functions in `agent.js` with real API calls:

```js
// Replace this:
function erpLookup({ vendor, amount, budget }) {
  return { budget_sufficient: amount <= budget, ... };
}

// With your real ERP:
async function erpLookup({ vendor, amount, budget }) {
  const res = await fetch(`https://your-erp.com/api/budget?vendor=${vendor}`);
  return await res.json();
}
```

### Add more guardrail layers
Add new checks in `runApprovalAgent()` after the Claude response:

```js
// Example: L5 — sanction list check
if (await sanctionListCheck(po.vendor)) {
  finalDecision = 'BLOCK';
  addStep('Guardrail L5 — sanctions', 'Vendor found on sanctions list.', 'block');
}
```

### Tune the policy rules
Edit the `SYSTEM_PROMPT` in `agent.js` to change approval thresholds, authorization matrix, or add new policy dimensions.

---

## Requirements

- Node.js 18+
- An Anthropic API key ([get one here](https://console.anthropic.com))

---

## Presentation context

This project is the live demo for the talk **"Agentic AI Is Powerful — But Who Controls the Decisions?"** — a technical deep dive into decision authority, human oversight, and guardrail architecture in autonomous financial systems.

Key concepts demonstrated:
- Agentic tool-use loops (multi-step, multi-tool reasoning)
- Defense-in-depth guardrail architecture
- Prompt injection as a real attack vector
- Confidence-based human escalation
- Audit-ready decision trails

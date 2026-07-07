# Liquid Staking Intent Agent

A Node.js/TypeScript backend agent that parses natural language staking intents, proposes constrained liquid-staking routes, and enforces policy limits through evaluation.

## Overview

This agent receives a user's intent (e.g., "earn safely on 10 CSPR"), uses OpenRouter to parse and understand the request, builds a liquid-staking route proposal, and evaluates it against a hard policy contract. It demonstrates:

- AI-powered intent parsing (OpenRouter with Claude Sonnet)
- Policy-driven action filtering (Zod-validated constraints)
- Real route selection logic (based on risk and amount limits)
- No mocks or stubs - all logic is production-grade

## Architecture

src/ai.ts: OpenRouter client, intent parsing
src/policy.ts: Policy validation and constraint checking
src/routes.ts: Liquid-staking route builder with testnet targets
src/agent.ts: Orchestrator that ties intent, routes, and policy
src/server.ts: Express HTTP server for API integration
src/cli.ts: Command-line interface for testing

## Setup

1. Create .env with OPENROUTER_API_KEY:

export PATH="/Users/kamal/.nvm/versions/node/v24.9.0/bin:$PATH"
npm install
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env

2. Run TypeScript check:

npx tsc --noEmit

3. Test core logic (no AI required):

npm run test:policy

Expected output:
- Test 1: PASS (allowed action within limits)
- Test 2: PASS (correctly blocked over-limit action)
- Test 3: PASS (correctly blocked wrong target)

## Usage

### CLI Demo

```bash
npm run cli -- "earn safely on 5 CSPR"
npm run cli -- "stake 50 CSPR"  # Should be rejected (over limit)
```

### Express Server

```bash
npm run dev
curl http://localhost:3002/health
curl http://localhost:3002/api/demo
```

POST /api/intent with body:
{
  "intentText": "earn safely on 10 CSPR",
  "policy": {
    "agent": "0199c6c70c88b8edd07a1fc2f63ee8b8bf0e4d5b8f",
    "maxAmount": "10000000000",
    "allowedTarget": "02025eb40c970e6819f4ffa4c47b4a45c9c9f4d21e",
    "expiry": 2147483647,
    "revoked": false
  }
}

Response:
{
  "success": true,
  "decision": {
    "parsed": { "amount": "10", "riskPreference": "conservative", "action": "stake" },
    "route": { "action": "stake", "target": "...", "amount": "10000000000", ... },
    "verdict": { "allowed": true, "reason": "Policy constraints satisfied" }
  }
}

## Key Design Decisions

1. Frozen Contract Interface: Policy contract has set_policy, execute_intent entrypoints with fixed error codes (NoPolicy, AmountExceedsLimit, WrongTarget, Expired, Revoked).

2. Zod Validation: All AI outputs and API inputs validated with schemas before use.

3. No AI Output Mocks: Intent parsing and route explanation go to OpenRouter. If the service is unavailable, the agent fails cleanly with retry logic.

4. Testnet-Only Targets: staking-config.json contains realistic but labeled "testnet demonstration" contract addresses and APY figures.

5. BigInt for Amounts: All CSPR/motes handled as BigInt to avoid floating-point precision issues.

## Configuration

staking-config.json: Liquid-staking targets (validators, LST contracts, pools)
demo-policy.json: Example policy for testing (max 10 CSPR to csLiquid LST)

## Scripts

npm run typecheck - TypeScript validation
npm run cli - Run CLI demo
npm run test:policy - Test policy evaluation and routing logic
npm run dev - Start Express server with hot reload
npm run build - Compile TypeScript to dist/
npm start - Run compiled server

## Dependencies

express@^4.18.2
openai@^6.45.0 (pointing to OpenRouter)
casper-js-sdk@^5.0.12
dotenv@^16.3.1
zod@^3.22.4

## Integration Notes

For integration with the Casper smart contract:
- The agent's decision verdict is returned to the frontend
- Frontend calls the contract's execute_intent with the proposed route if allowed
- Contract enforces max_amount, allowed_target, and expiry constraints again as safety gate

For integration with CSPR.click and CSPR.cloud:
- Frontend uses CSPR.click wallet to sign transactions
- Backend uses CSPR.cloud REST API to read emitted events
- This agent focuses on route proposal and policy evaluation, not on-chain execution

## Testing

All core logic (policy evaluation, route building) is tested without requiring OpenRouter API:

npm run test:policy

Output shows:
1. Allowed action (5 CSPR within 10 CSPR limit) - PASS
2. Blocked action (50 CSPR exceeds 10 CSPR limit) - PASS
3. Blocked action (unauthorized target) - PASS

# Casper Liquid Staking Intent Agent

**Turn "earn safely on my CSPR" into a constrained liquid-staking action.**

An AI agent that interprets natural-language staking intents, proposes bounded liquid-staking routes on Casper, and executes only when an on-chain Odra policy contract permits it. Built with the Odra framework for Casper 2.0.

**Repository:** [github.com/kamalbuilds/casper-liquid-staking-intent-agent](https://github.com/kamalbuilds/casper-liquid-staking-intent-agent)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Contract Addresses](#contract-addresses)
- [Getting Started](#getting-started)
- [Frontend](#frontend)
- [Contract Functions](#contract-functions)
- [Security](#security)
- [License](#license)
- [Links](#links)

---

## Overview

Casper Liquid Staking Intent Agent bridges plain-language user goals and on-chain liquid-staking execution. A user describes what they want (for example, "earn safely on 10 CSPR"). The backend agent evaluates liquid-staking and DEX context, proposes a bounded action, and the `IntentPolicy` contract enforces hard limits before any intent is recorded on-chain.

### Key Metrics (Testnet)

| Metric | Value |
|--------|-------|
| **Network** | Casper Testnet |
| **Contract** | IntentPolicy |
| **Agent Port** | 3002 |
| **Frontend** | Next.js 14 on port 3000 |

### Problem

Casper has liquid-staking contracts and CSPR.trade MCP tooling, but users still need to understand validators, LST routes, swaps, liquidity, and risk. A generic yield dashboard repeats old mistakes. The wedge is intent execution with hard policy bounds.

### Solution

An AI agent receives a user intent, checks liquid-staking and DEX context, proposes a bounded action, and executes only if the Odra policy contract permits it. The demo stakes or routes a small testnet amount, then shows policy rejection for unsafe size or unsupported recipient.

---

## Features

- **Natural-Language Intents**: Users describe goals in plain text instead of composing transactions manually
- **On-Chain Policy Guard**: `IntentPolicy` enforces max amount, allowed target, expiry, and revocation before execution
- **Typed Rejection Paths**: Every policy violation reverts with a stable error code (NoPolicy, Revoked, Expired, WrongTarget, AmountExceedsLimit)
- **Event Proofs**: `PolicySet`, `PolicyRevoked`, and `IntentExecuted` events provide auditable on-chain history
- **CSPR.click Wallet**: Frontend signs `execute_intent` transactions through CSPR.click
- **CSPR.cloud Event Stream**: Proof table reads `IntentExecuted` events for settlement verification

---

## Architecture

```
                    +------------------+
                    |   User Wallet    |
                    |   (CSPR.click)   |
                    +--------+---------+
                             |
                             v
+----------------------------------------------------------+
|              Frontend (Next.js, port 3000)                |
|  - PolicyPanel: Set agent cap, target, expiry             |
|  - IntentForm: Submit natural-language intent             |
|  - ProofTable: View IntentExecuted events                 |
+---------------------------+------------------------------+
                            |
                            v
+----------------------------------------------------------+
|           Agent Backend (Express, port 3002)              |
|  - POST /api/intent: Parse intent, evaluate route         |
|  - POST /api/demo: Load demo policy for testing           |
|  - Liquid-staking context via staking-config.json         |
+---------------------------+------------------------------+
                            |
                            v
+----------------------------------------------------------+
|              IntentPolicy Contract (Odra)                 |
|  - set_policy(): Owner registers agent spending limits    |
|  - execute_intent(): Agent acts within policy bounds      |
|  - revoke_policy(): Owner disables agent immediately      |
+--------------+-----------------------------+--------------+
               |                             |
               v                             v
    +------------------+          +------------------+
    |  csLiquid LST    |          |  CSPR.trade DEX  |
    |  (allowed target)|          |  (route context) |
    +------------------+          +------------------+
```

---

## Smart Contracts

### IntentPolicy

The on-chain policy guard for the Liquid Staking Intent Agent. The owner registers a spending policy for an agent address. The agent calls `execute_intent`, which is accepted only when the requested action is within the registered policy.

**Entry Points:**

| Function | Description | Parameters |
|----------|-------------|------------|
| `init` | Initialize contract with deployer as owner | - |
| `set_policy` | Register or replace policy for an agent (owner only) | `agent: Address`, `max_amount: U512`, `allowed_target: Address`, `expiry: u64` |
| `revoke_policy` | Disable an agent policy (owner only) | `agent: Address` |
| `execute_intent` | Agent executes an in-policy intent | `target: Address`, `amount: U512`, `intent_hash: String` |
| `get_owner` | Returns the current contract owner | - |
| `get_policy` | Returns the policy for an agent, or none | `agent: Address` |

**Events:**

| Event | Fields | When Emitted |
|-------|--------|--------------|
| `PolicySet` | `agent`, `max_amount`, `allowed_target`, `expiry` | Owner registers or updates a policy |
| `PolicyRevoked` | `agent` | Owner revokes a policy |
| `IntentExecuted` | `agent`, `target`, `amount`, `intent_hash` | Agent successfully executes an in-policy intent |

**Errors:**

| Code | Error | Condition |
|------|-------|-----------|
| 1 | `NotOwner` | Non-owner calls an owner-only entrypoint |
| 2 | `NoPolicy` | Agent has no registered policy |
| 3 | `Revoked` | Policy has been revoked |
| 4 | `Expired` | Block time is past policy expiry |
| 5 | `WrongTarget` | Target does not match allowed target |
| 6 | `AmountExceedsLimit` | Amount exceeds max amount |

---

## Contract Addresses

### Casper Testnet

| Item | Value |
|------|-------|
| **Contract** | IntentPolicy |
| **Package Hash** | `hash-81cf4b79d524ddb22ffb7346ca1fa0adcc84f8377e60f9d9789146c00023dd1b` |
| **Deploy Transaction** | `6ddd1dc151326aa8b2abcb47eff06771011d22933d0cdc15869fbbdb38fdf0ef` |

### Network Configuration

| Setting | Value |
|---------|-------|
| **Chain Name** | `casper-test` |
| **Node URL** | `https://node.testnet.casper.network` |
| **CSPR.cloud RPC** | `https://node.testnet.cspr.cloud/rpc` |
| **Explorer** | `https://testnet.cspr.live` |

---

## Getting Started

### Prerequisites

- Rust 1.70+
- [cargo-odra](https://github.com/odradev/cargo-odra)
- Node.js 18+
- OpenRouter API key (for agent LLM calls)

### Build Contracts

```bash
cd contract
cargo odra build -b casper
```

### Test Contracts

```bash
cd contract
cargo odra test
```

### Run Agent Backend

```bash
cd agent
cp .env.example .env
# Edit .env with OPENROUTER_API_KEY and CONTRACT_HASH
npm install
npm run dev
```

The agent listens on `http://localhost:3002`.

### Run Frontend

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local with CSPR.click app ID and contract hash
npm install
npm run dev
```

The frontend listens on `http://localhost:3000`.

### Quick Demo

```bash
# Load demo policy
curl http://localhost:3002/api/demo

# Submit an in-policy intent
curl -X POST http://localhost:3002/api/intent \
  -H "Content-Type: application/json" \
  -d '{"intentText":"earn safely on 5 CSPR","policy":{...}}'

# Submit an over-limit intent (agent rejects before on-chain call)
curl -X POST http://localhost:3002/api/intent \
  -H "Content-Type: application/json" \
  -d '{"intentText":"stake 50 CSPR","policy":{...}}'
```

---

## Frontend

The frontend is a Next.js 14 application with CSPR.click wallet integration.

### Pages and Components

| Component | Purpose |
|-----------|---------|
| **PolicyPanel** | Configure agent address, max amount, allowed target, and expiry |
| **IntentForm** | Submit natural-language intent to the agent backend |
| **ProofTable** | Display `IntentExecuted` events from CSPR.cloud |
| **ConnectWallet** | CSPR.click wallet connection |

### Wallet Integration

Uses CSPR.click for wallet connection supporting:

- Casper Wallet
- Ledger
- Torus Wallet
- CasperDash
- MetaMask Snap

### Environment Variables

**Agent (`agent/.env`):**

```env
OPENROUTER_API_KEY=sk_test_your_key_here
CONTRACT_HASH=hash-of-your-deployed-policy-contract
CASPER_NODE_ADDRESS=https://node.testnet.cspr.cloud/rpc
PORT=3002
```

**Frontend (`web/.env.local`):**

```env
NEXT_PUBLIC_CSPR_CLICK_APP_ID=your-cspr-click-app-id
NEXT_PUBLIC_AGENT_URL=http://localhost:3002
NEXT_PUBLIC_CONTRACT_HASH=hash-81cf4b79d524ddb22ffb7346ca1fa0adcc84f8377e60f9d9789146c00023dd1b
CONTRACT_HASH=hash-81cf4b79d524ddb22ffb7346ca1fa0adcc84f8377e60f9d9789146c00023dd1b
CSPR_CLOUD_ACCESS_KEY=your-cspr-cloud-access-key
```

---

## Contract Functions

### User Intent Flow

```
+----------+   "earn safely on 5 CSPR"   +--------------+
|   User   | --------------------------> | IntentForm   |
|          |                           | (Frontend)   |
+----------+                           +------+-------+
                                              |
                                              v
                                       +--------------+
                                       | Agent (3002) |
                                       | /api/intent  |
                                       +------+-------+
                                              |
                              in-policy?      |      over-limit?
                              +---------------+---------------+
                              v                               v
                     +----------------+              +----------------+
                     | execute_intent |              | Reject locally |
                     | (CSPR.click)   |              | (no tx sent)   |
                     +--------+-------+              +----------------+
                              |
                              v
                     +----------------+
                     | IntentPolicy   |
                     | emit event     |
                     +----------------+
```

### Owner Policy Flow

```
+-----------+                           +--------------+
|   Owner   |                           | IntentPolicy |
+-----+-----+                           +------+-------+
      |                                        |
      | set_policy(agent, max, target, expiry) |
      | -------------------------------------> |
      |                                        | emit PolicySet
      |                                        |
      | revoke_policy(agent)                   |
      | -------------------------------------> |
      |                                        | emit PolicyRevoked
      |                                        |
      | get_policy(agent)                      |
      | -------------------------------------> |
```

### Policy Check Order

`execute_intent` evaluates checks in this order:

1. `NoPolicy` if agent has no registered policy
2. `Revoked` if policy is disabled
3. `Expired` if block time exceeds expiry
4. `WrongTarget` if target does not match allowed target
5. `AmountExceedsLimit` if amount exceeds max amount
6. Emit `IntentExecuted` on success

---

## Security

### Access Control

- Owner-only functions: `set_policy`, `revoke_policy`
- Agent identity verified via `env().caller()` on `execute_intent`
- Policy fields are immutable after registration except via `set_policy` replacement or `revoke_policy`

### Safety Features

- Hard cap on per-intent amount (`max_amount`)
- Whitelist of a single allowed target address
- Time-bounded policies with explicit expiry
- Immediate revocation without waiting for expiry
- Typed revert errors for every rejection path

### Agent Safety

- Backend evaluates intent against policy before building a transaction
- Over-limit intents are rejected off-chain before wallet signing
- Intent hash recorded on-chain for audit trail

### Audits

- [ ] Pending security audit

---

## License

MIT License

---

## Links

- **GitHub**: [casper-liquid-staking-intent-agent](https://github.com/kamalbuilds/casper-liquid-staking-intent-agent)
- **Testnet Explorer**: [cspr.live](https://testnet.cspr.live/deploy/6ddd1dc151326aa8b2abcb47eff06771011d22933d0cdc15869fbbdb38fdf0ef)
- **Casper Documentation**: [docs.casper.network](https://docs.casper.network)
- **Odra Framework**: [odra.dev](https://odra.dev)
- **CSPR.click**: [cspr.click](https://cspr.click)
- **CSPR.cloud**: [docs.cspr.cloud](https://docs.cspr.cloud)

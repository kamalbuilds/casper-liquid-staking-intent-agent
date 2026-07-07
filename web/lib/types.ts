// Shared types mirroring the backend agent's contract exactly.
// Source of truth: liquid-staking-intent-agent/agent/src/{policy,routes,agent}.ts

export interface Policy {
  agent: string;
  maxAmount: string; // motes, as a decimal string (BigInt-safe)
  allowedTarget: string;
  expiry: number; // unix seconds
  revoked: boolean;
  description?: string;
}

export interface ParsedIntent {
  amount: string;
  riskPreference: string;
  action: string;
}

export interface StakingRoute {
  action: "stake" | "route";
  target: string;
  targetLabel: string;
  amount: string;
  reason: string;
  riskNotes: string[];
  estimatedYield: string;
  warnings: string[];
}

export interface Verdict {
  allowed: boolean;
  reason: string;
  violatedRule?: string;
  details?: Record<string, unknown>;
}

export interface ExecutionDecision {
  parsed: ParsedIntent;
  route: StakingRoute;
  verdict: Verdict;
  explanation?: string;
}

export interface IntentApiSuccess {
  success: true;
  decision: ExecutionDecision;
}

export interface IntentApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type IntentApiResponse = IntentApiSuccess | IntentApiError;

export interface ProofEvent {
  time: string;
  target: string;
  amount: string;
  intentHash: string;
  deployHash: string;
}

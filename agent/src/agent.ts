import { parseIntent, explainRoute } from "./ai.js";
import { buildStakingRoute, StakingRoute } from "./routes.js";
import { evaluate, type Policy, policyToString } from "./policy.js";
import { csprToMotes } from "./cspr.js";

export interface ParsedIntent {
  amount: string;
  riskPreference: string;
  action: string;
}

export interface ExecutionDecision {
  parsed: ParsedIntent;
  route: StakingRoute;
  verdict: {
    allowed: boolean;
    reason: string;
    violatedRule?: string;
  };
  explanation?: string;
}

export async function runIntent(
  intentText: string,
  policy: Policy
): Promise<ExecutionDecision> {
  console.log("[agent] Running intent:", intentText);
  console.log("[agent] Policy:", policyToString(policy));

  let parsed: ParsedIntent;
  try {
    parsed = await parseIntent(intentText);
    console.log("[agent] Parsed intent:", parsed);
  } catch (err) {
    console.error("[agent] Failed to parse intent:", err);
    throw new Error(`Intent parsing failed: ${err}`);
  }

  const amountMotes = csprToMotes(parsed.amount);

  let route: StakingRoute;
  try {
    route = buildStakingRoute(amountMotes, parsed.riskPreference);
    console.log("[agent] Built route to:", route.targetLabel);
  } catch (err) {
    console.error("[agent] Failed to build route:", err);
    throw new Error(`Route building failed: ${err}`);
  }

  const verdictResult = evaluate(
    {
      target: route.target,
      amount: amountMotes,
    },
    policy
  );

  let explanation: string | undefined;
  if (verdictResult.allowed) {
    try {
      explanation = await explainRoute(intentText, {
        action: route.action,
        target: route.target,
        amount: amountMotes,
        reason: route.reason,
      });
    } catch (err) {
      console.warn("[agent] Failed to generate explanation:", err);
      explanation = route.reason;
    }
  }

  const decision: ExecutionDecision = {
    parsed,
    route,
    verdict: {
      allowed: verdictResult.allowed,
      reason: verdictResult.reason,
      violatedRule: verdictResult.violatedRule,
    },
    explanation,
  };

  console.log(
    "[agent] Decision:",
    decision.verdict.allowed ? "ALLOWED" : "BLOCKED"
  );
  console.log("[agent] Verdict reason:", decision.verdict.reason);

  return decision;
}

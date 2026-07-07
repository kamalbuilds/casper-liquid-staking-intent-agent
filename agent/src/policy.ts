import { z } from "zod";

const PolicySchema = z.object({
  agent: z.string(),
  maxAmount: z.string(),
  allowedTarget: z.string(),
  expiry: z.number(),
  revoked: z.boolean(),
  description: z.string().optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

const RequestSchema = z.object({
  target: z.string(),
  amount: z.string(),
  intentHash: z.string().optional(),
});

export type EvaluationRequest = z.infer<typeof RequestSchema>;

export interface EvaluationResult {
  allowed: boolean;
  reason: string;
  violatedRule?: string;
  details?: Record<string, unknown>;
}

export function evaluate(
  request: EvaluationRequest,
  policy: Policy
): EvaluationResult {
  try {
    RequestSchema.parse(request);
  } catch (err) {
    return {
      allowed: false,
      reason: "Invalid request format",
      violatedRule: "schema_validation",
    };
  }

  try {
    PolicySchema.parse(policy);
  } catch (err) {
    return {
      allowed: false,
      reason: "Invalid policy format",
      violatedRule: "policy_schema_validation",
    };
  }

  if (policy.revoked) {
    return {
      allowed: false,
      reason: "Policy has been revoked",
      violatedRule: "Revoked",
      details: { revokedAt: "unknown" },
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > policy.expiry) {
    return {
      allowed: false,
      reason: `Policy expired at ${policy.expiry}`,
      violatedRule: "Expired",
      details: { expiryTime: policy.expiry, currentTime: now },
    };
  }

  if (request.target !== policy.allowedTarget) {
    return {
      allowed: false,
      reason: `Target ${request.target} not in allowed targets (${policy.allowedTarget})`,
      violatedRule: "WrongTarget",
      details: {
        requestedTarget: request.target,
        allowedTarget: policy.allowedTarget,
      },
    };
  }

  const requestAmount = BigInt(request.amount);
  const maxAmount = BigInt(policy.maxAmount);
  if (requestAmount > maxAmount) {
    return {
      allowed: false,
      reason: `Amount ${request.amount} exceeds limit ${policy.maxAmount}`,
      violatedRule: "AmountExceedsLimit",
      details: {
        requestedAmount: request.amount,
        maxAllowedAmount: policy.maxAmount,
      },
    };
  }

  return {
    allowed: true,
    reason: "Policy constraints satisfied",
    details: {
      target: request.target,
      amount: request.amount,
      maxAmount: policy.maxAmount,
    },
  };
}

export function policyToString(policy: Policy): string {
  const expiryDate = new Date(policy.expiry * 1000);
  return `
Policy:
  Agent: ${policy.agent}
  Max Amount: ${policy.maxAmount} motes (${formatMotes(policy.maxAmount)} CSPR)
  Allowed Target: ${policy.allowedTarget}
  Expiry: ${expiryDate.toISOString()}
  Revoked: ${policy.revoked}
  ${policy.description ? `Description: ${policy.description}` : ""}
`.trim();
}

function formatMotes(motes: string): string {
  try {
    const amount = BigInt(motes);
    const divisor = BigInt(1000000000);
    const cspr = amount / divisor;
    return cspr.toString();
  } catch {
    return "invalid";
  }
}

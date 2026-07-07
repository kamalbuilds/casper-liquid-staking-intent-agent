"use client";

import { csprToMotes, motesToCspr, NO_EXPIRY_SECONDS } from "@/lib/cspr";
import type { Policy } from "@/lib/types";
import { useState } from "react";

interface PolicyPanelProps {
  policy: Policy;
  onChange: (policy: Policy) => void;
  connectedPublicKey?: string;
}

/**
 * Editable view of the on-chain IntentPolicy record: max amount, allowed
 * target, expiry, and the agent address permitted to call `execute_intent`.
 * This mirrors `IntentPolicy::Policy` in contract/src/intent_policy.rs and
 * the backend's `PolicySchema` in agent/src/policy.ts exactly.
 */
export function PolicyPanel({
  policy,
  onChange,
  connectedPublicKey,
}: PolicyPanelProps) {
  const [maxAmountCspr, setMaxAmountCspr] = useState(() =>
    motesToCspr(policy.maxAmount)
  );
  const [amountError, setAmountError] = useState<string | null>(null);

  function updateMaxAmount(value: string) {
    setMaxAmountCspr(value);
    try {
      const motes = csprToMotes(value || "0");
      setAmountError(null);
      onChange({ ...policy, maxAmount: motes });
    } catch (err) {
      setAmountError(err instanceof Error ? err.message : "Invalid amount");
    }
  }

  function expiryToInputValue(expirySeconds: number): string {
    if (expirySeconds >= NO_EXPIRY_SECONDS) {
      return "";
    }
    const date = new Date(expirySeconds * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Policy</h2>
        <span className="badge badge-neutral">On-chain guard</span>
      </div>
      <p className="card-sub">
        The IntentPolicy contract enforces these bounds. Any intent outside
        them reverts on-chain, it is never a client-side check alone.
      </p>

      <div className="field">
        <label htmlFor="policy-agent">Agent address</label>
        <div className="input-row">
          <input
            id="policy-agent"
            className="input mono"
            value={policy.agent}
            onChange={(e) => onChange({ ...policy, agent: e.target.value })}
            placeholder="account-hash-... or public key hex"
          />
          {connectedPublicKey ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onChange({ ...policy, agent: connectedPublicKey })}
            >
              Use my wallet
            </button>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="policy-max-amount">Max amount per intent</label>
        <div className="input-row">
          <input
            id="policy-max-amount"
            className="input mono"
            inputMode="decimal"
            value={maxAmountCspr}
            onChange={(e) => updateMaxAmount(e.target.value)}
          />
          <span className="input-suffix">CSPR</span>
        </div>
        {amountError ? <span className="field-error">{amountError}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="policy-target">Allowed target</label>
        <input
          id="policy-target"
          className="input mono"
          value={policy.allowedTarget}
          onChange={(e) =>
            onChange({ ...policy, allowedTarget: e.target.value })
          }
          placeholder="LST contract or validator address"
        />
      </div>

      <div className="field">
        <label htmlFor="policy-expiry">Expiry</label>
        <input
          id="policy-expiry"
          className="input"
          type="datetime-local"
          value={expiryToInputValue(policy.expiry)}
          onChange={(e) => {
            if (!e.target.value) {
              onChange({ ...policy, expiry: NO_EXPIRY_SECONDS });
              return;
            }
            const seconds = Math.floor(new Date(e.target.value).getTime() / 1000);
            onChange({ ...policy, expiry: seconds });
          }}
        />
        <span className="field-hint">Leave blank for no expiry</span>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={policy.revoked}
          onChange={(e) => onChange({ ...policy, revoked: e.target.checked })}
        />
        Revoked (blocks every intent regardless of amount or target)
      </label>
    </div>
  );
}

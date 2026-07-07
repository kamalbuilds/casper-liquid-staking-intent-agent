"use client";

import { useClickRef } from "@make-software/csprclick-ui";
import { useCsprAccount } from "@/lib/useCsprAccount";
import {
  buildExecuteIntentTransaction,
  buildSetPolicyTransaction,
  explorerDeployUrl,
  sha256Hex,
} from "@/lib/cspr";
import type { ExecutionDecision, IntentApiResponse, Policy } from "@/lib/types";
import { useState } from "react";
import { RoutePreview } from "./RoutePreview";

const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:3002";

type SignState =
  | { status: "idle" }
  | { status: "signing"; step: "set_policy" | "execute_intent" }
  | { status: "sent"; policyTxHash: string; executeTxHash: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export function IntentForm({ policy }: { policy: Policy }) {
  const { account } = useCsprAccount();
  const clickRef = useClickRef();

  const [intentText, setIntentText] = useState("earn safely on 10 CSPR");
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<ExecutionDecision | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [signState, setSignState] = useState<SignState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intentText.trim()) {
      return;
    }

    setSubmitting(true);
    setApiError(null);
    setDecision(null);
    setSignState({ status: "idle" });

    try {
      const res = await fetch(`${AGENT_URL}/api/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentText, policy }),
      });

      const body: IntentApiResponse = await res.json();

      if (!res.ok || !body.success) {
        const message =
          !body.success && body.error
            ? body.error
            : `Agent request failed (${res.status})`;
        console.error("[IntentForm] agent request failed:", message);
        setApiError(message);
        return;
      }

      setDecision(body.decision);
    } catch (err) {
      console.error("[IntentForm] failed to reach agent:", err);
      setApiError(
        `Could not reach the agent at ${AGENT_URL}. Is it running? (${
          err instanceof Error ? err.message : String(err)
        })`
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignAndExecute() {
    if (!decision || !decision.verdict.allowed) {
      return;
    }
    if (!account) {
      setSignState({
        status: "error",
        message: "Connect a wallet before signing",
      });
      return;
    }
    if (!clickRef) {
      setSignState({
        status: "error",
        message: "Wallet SDK is still loading, try again in a moment",
      });
      return;
    }
    const contractHash = process.env.NEXT_PUBLIC_CONTRACT_HASH;
    if (!contractHash) {
      setSignState({
        status: "error",
        message:
          "NEXT_PUBLIC_CONTRACT_HASH is not set, deploy the IntentPolicy contract and set it in .env.local",
      });
      return;
    }

    if (!policy.agent.trim()) {
      setSignState({
        status: "error",
        message:
          "Set an agent address in the policy panel (use your wallet if you will sign execute_intent)",
      });
      return;
    }

    setSignState({ status: "signing", step: "set_policy" });
    try {
      const policyTx = buildSetPolicyTransaction({
        ownerPublicKeyHex: account.public_key,
        contractHash,
        agentHex: policy.agent,
        maxAmountMotes: policy.maxAmount,
        allowedTargetHex: policy.allowedTarget,
        expirySeconds: policy.expiry,
      });

      const policyResult = await clickRef.send(
        policyTx.toJSON() as object,
        account.public_key
      );

      if (!policyResult || policyResult.cancelled) {
        setSignState({ status: "cancelled" });
        return;
      }
      if (policyResult.error) {
        console.error(
          "[IntentForm] set_policy failed:",
          policyResult.error,
          policyResult.errorData
        );
        setSignState({ status: "error", message: policyResult.error });
        return;
      }

      const policyTxHash =
        policyResult.transactionHash || policyResult.deployHash || "";

      const intentHash = await sha256Hex(
        JSON.stringify({
          intentText,
          target: decision.route.target,
          amount: decision.route.amount,
          agent: policy.agent,
          ts: Date.now(),
        })
      );

      setSignState({ status: "signing", step: "execute_intent" });

      const executeTx = buildExecuteIntentTransaction({
        callerPublicKeyHex: account.public_key,
        contractHash,
        targetHex: decision.route.target,
        amountMotes: decision.route.amount,
        intentHash,
      });

      const executeResult = await clickRef.send(
        executeTx.toJSON() as object,
        account.public_key
      );

      if (!executeResult || executeResult.cancelled) {
        setSignState({ status: "cancelled" });
        return;
      }
      if (executeResult.error) {
        console.error(
          "[IntentForm] execute_intent failed:",
          executeResult.error,
          executeResult.errorData
        );
        setSignState({ status: "error", message: executeResult.error });
        return;
      }

      const executeTxHash =
        executeResult.transactionHash || executeResult.deployHash || "";
      setSignState({
        status: "sent",
        policyTxHash,
        executeTxHash,
      });
    } catch (err) {
      console.error("[IntentForm] sign/execute failed:", err);
      setSignState({
        status: "error",
        message: err instanceof Error ? err.message : "Signing failed",
      });
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Intent</h2>
        <span className="badge badge-neutral">Agent + policy</span>
      </div>
      <p className="card-sub">
        Describe the outcome you want. The agent proposes a bounded route,
        then the on-chain policy decides whether it is allowed to run.
      </p>

      <form onSubmit={handleSubmit} className="intent-form">
        <textarea
          className="textarea"
          rows={3}
          value={intentText}
          onChange={(e) => setIntentText(e.target.value)}
          placeholder="earn safely on 10 CSPR"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Thinking..." : "Propose route"}
        </button>
      </form>

      {apiError ? <div className="alert alert-error">{apiError}</div> : null}

      {decision ? (
        <div className="decision">
          <div className="parsed-row">
            <span className="field-hint">Parsed intent</span>
            <span className="mono">
              {decision.parsed.action} · {decision.parsed.amount} motes ·{" "}
              {decision.parsed.riskPreference}
            </span>
          </div>

          <RoutePreview route={decision.route} />

          {decision.verdict.allowed ? (
            <div className="alert alert-success">
              <strong>Allowed.</strong> {decision.verdict.reason}
              {decision.explanation ? (
                <p className="explanation">{decision.explanation}</p>
              ) : null}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSignAndExecute}
                disabled={signState.status === "signing"}
              >
                {signState.status === "signing"
                  ? signState.step === "set_policy"
                    ? "Sign set_policy in wallet..."
                    : "Sign execute_intent in wallet..."
                  : "Sign policy & execute on testnet"}
              </button>

              {signState.status === "sent" ? (
                <p className="sign-result sign-result-success">
                  Policy set:{" "}
                  <a
                    href={explorerDeployUrl(signState.policyTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                  >
                    {signState.policyTxHash}
                  </a>
                  <br />
                  Intent executed:{" "}
                  <a
                    href={explorerDeployUrl(signState.executeTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono"
                  >
                    {signState.executeTxHash}
                  </a>
                </p>
              ) : null}
              {signState.status === "cancelled" ? (
                <p className="sign-result">Signing was cancelled in the wallet.</p>
              ) : null}
              {signState.status === "error" ? (
                <p className="sign-result sign-result-error">
                  {signState.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="alert alert-error">
              <strong>Blocked.</strong> {decision.verdict.reason}
              {decision.verdict.violatedRule ? (
                <span className="violation-code mono">
                  {decision.verdict.violatedRule}
                </span>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

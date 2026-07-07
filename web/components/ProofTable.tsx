"use client";

import { truncateMiddle } from "@/lib/cspr";
import type { ProofEvent } from "@/lib/types";
import { useEffect, useState } from "react";

type LoadState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "ready"; events: ProofEvent[] };

export function ProofTable() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const body = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          console.error("[ProofTable] /api/events failed:", body?.error);
          setState({
            status: "error",
            message: body?.error || `Request failed (${res.status})`,
          });
          return;
        }

        if (!body.configured) {
          setState({ status: "unconfigured" });
          return;
        }

        setState({ status: "ready", events: body.events ?? [] });
      } catch (err) {
        console.error("[ProofTable] failed to load events:", err);
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Network error",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Proof</h2>
        <span className="badge badge-neutral">On-chain record</span>
      </div>
      <p className="card-sub">
        Every allowed intent that executes emits <code>IntentExecuted</code>{" "}
        on-chain. This table reads that log directly from CSPR.cloud, it is
        not a local record of what the UI thinks happened.
      </p>

      {state.status === "loading" ? (
        <p className="field-hint">Loading proof log...</p>
      ) : null}

      {state.status === "unconfigured" ? (
        <div className="empty-state">
          No contract wired up yet. Set <code>CONTRACT_HASH</code> and{" "}
          <code>CSPR_CLOUD_ACCESS_KEY</code> in the agent&apos;s environment
          once the IntentPolicy contract is deployed, and executed intents
          will appear here.
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="alert alert-error">{state.message}</div>
      ) : null}

      {state.status === "ready" && state.events.length === 0 ? (
        <div className="empty-state">
          No intents have executed on-chain yet. Sign one above and it will
          show up here once the deploy finalizes.
        </div>
      ) : null}

      {state.status === "ready" && state.events.length > 0 ? (
        <table className="proof-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Target</th>
              <th>Amount</th>
              <th>Intent hash</th>
              <th>Deploy</th>
            </tr>
          </thead>
          <tbody>
            {state.events.map((event) => (
              <tr key={`${event.deployHash}-${event.intentHash}`}>
                <td>{event.time || "—"}</td>
                <td className="mono">{truncateMiddle(event.target, 8, 6)}</td>
                <td className="mono">{event.amount || "—"}</td>
                <td className="mono">
                  {truncateMiddle(event.intentHash, 8, 6)}
                </td>
                <td className="mono">
                  {event.deployHash ? (
                    <a
                      href={`https://testnet.cspr.live/deploy/${event.deployHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {truncateMiddle(event.deployHash, 8, 6)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

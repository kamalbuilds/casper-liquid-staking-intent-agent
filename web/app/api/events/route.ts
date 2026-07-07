import { NextResponse } from "next/server";
import type { ProofEvent } from "@/lib/types";

// Server-side route: keeps CSPR_CLOUD_ACCESS_KEY off the client. Reads the
// IntentExecuted events emitted by the deployed IntentPolicy contract from
// CSPR.cloud's REST API (see docs.cspr.cloud, contracts/{hash}/events).
export const dynamic = "force-dynamic";

interface CsprCloudEventEnvelope {
  name?: string;
  event_name?: string;
  contract_event_name?: string;
  deploy_hash?: string;
  transaction_hash?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function pickString(
  envelope: CsprCloudEventEnvelope,
  keys: string[]
): string {
  for (const key of keys) {
    const fromData = envelope.data?.[key];
    if (typeof fromData === "string") return fromData;
    const fromTop = envelope[key];
    if (typeof fromTop === "string") return fromTop;
  }
  return "";
}

function isIntentExecuted(envelope: CsprCloudEventEnvelope): boolean {
  const name =
    envelope.name || envelope.event_name || envelope.contract_event_name;
  if (name) {
    return name === "IntentExecuted";
  }
  // Some CSPR.cloud responses omit the event name at the top level; fall
  // back to detecting the IntentExecuted-shaped payload by its fields.
  return Boolean(
    envelope.data?.intent_hash ||
      envelope.data?.["intent_hash"] ||
      envelope["intent_hash"]
  );
}

function toProofEvent(envelope: CsprCloudEventEnvelope): ProofEvent {
  return {
    time: envelope.timestamp || "",
    target: pickString(envelope, ["target"]),
    amount: pickString(envelope, ["amount"]),
    intentHash: pickString(envelope, ["intent_hash", "intentHash"]),
    deployHash: envelope.deploy_hash || envelope.transaction_hash || "",
  };
}

export async function GET() {
  const contractHash = process.env.CONTRACT_HASH;
  const accessKey = process.env.CSPR_CLOUD_ACCESS_KEY;

  if (!contractHash || !accessKey) {
    return NextResponse.json({ configured: false, events: [] });
  }

  const normalizedHash = contractHash.replace(/^hash-/, "");
  const url = `https://api.testnet.cspr.cloud/contracts/${normalizedHash}/events?page=1&limit=25`;

  try {
    const res = await fetch(url, {
      headers: { authorization: accessKey },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[api/events] cspr.cloud fetch failed:", res.status);
      return NextResponse.json(
        { configured: true, error: `CSPR.cloud returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const raw: CsprCloudEventEnvelope[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
        ? json
        : [];

    const events = raw.filter(isIntentExecuted).map(toProofEvent);

    return NextResponse.json({ configured: true, events });
  } catch (err) {
    console.error("[api/events] request to cspr.cloud threw:", err);
    return NextResponse.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "Unknown fetch error",
      },
      { status: 502 }
    );
  }
}

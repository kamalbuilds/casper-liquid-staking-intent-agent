"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { IntentForm } from "@/components/IntentForm";
import { PolicyPanel } from "@/components/PolicyPanel";
import { ProofTable } from "@/components/ProofTable";
import { useCsprAccount } from "@/lib/useCsprAccount";
import type { Policy } from "@/lib/types";
import { useState } from "react";

const DEFAULT_POLICY: Policy = {
  agent: "",
  maxAmount: "10000000000", // 10 CSPR, matches agent/demo-policy.json
  allowedTarget: "02025eb40c970e6819f4ffa4c47b4a45c9c9f4d21e",
  expiry: 2147483647,
  revoked: false,
  description: "Demo policy: allow up to 10 CSPR stakes to the csLiquid LST contract",
};

export default function Home() {
  const { account } = useCsprAccount();
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);

  return (
    <main className="page">
      <div className="container">
        <header className="hero">
          <div className="hero-top">
            <span className="brand">Liquid Staking Intent Agent</span>
            <ConnectWallet />
          </div>
          <h1>Earn safely, within your limits</h1>
          <p className="hero-sub">
            Describe what you want in plain language. An agent proposes a
            bounded liquid-staking route on Casper, and an on-chain policy
            enforces your cap, target, and expiry before anything executes.
          </p>
        </header>

        <section className="grid">
          <PolicyPanel
            policy={policy}
            onChange={setPolicy}
            connectedPublicKey={account?.public_key}
          />
          <IntentForm policy={policy} />
        </section>

        <ProofTable />
      </div>
    </main>
  );
}

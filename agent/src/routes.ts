import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface StakingTarget {
  id: string;
  name: string;
  type: "validator" | "lst_contract" | "staking_pool";
  address: string;
  minStake: string;
  maxStake: string;
  description: string;
  riskLevel: string;
  estimatedYield: string;
  liquidityNote?: string;
  poolFee?: string;
}

interface StakingConfig {
  environment: string;
  note: string;
  liquidStakingTargets: StakingTarget[];
  risks: Record<string, string>;
  disclaimers: string[];
}

let stakingConfig: StakingConfig | null = null;

function loadStakingConfig(): StakingConfig {
  if (stakingConfig) {
    return stakingConfig;
  }

  const configPath = path.join(
    __dirname,
    "../staking-config.json"
  );
  const data = fs.readFileSync(configPath, "utf-8");
  stakingConfig = JSON.parse(data);
  return stakingConfig as StakingConfig;
}

function selectTargetForRisk(
  riskPreference: string,
  amount: string
): StakingTarget {
  const config = loadStakingConfig();
  const amountBigInt = BigInt(amount);

  const suitable = config.liquidStakingTargets.filter((t) => {
    const minStake = BigInt(t.minStake);
    const maxStake = BigInt(t.maxStake);
    return amountBigInt >= minStake && amountBigInt <= maxStake;
  });

  if (suitable.length === 0) {
    throw new Error(
      `No suitable staking target for amount ${amount} and risk ${riskPreference}`
    );
  }

  const filtered =
    riskPreference === "conservative"
      ? suitable.filter((t) => t.riskLevel === "low")
      : riskPreference === "aggressive"
        ? suitable.filter((t) =>
            ["medium-high", "high"].includes(t.riskLevel)
          )
        : suitable;

  if (filtered.length > 0) {
    return filtered[0];
  }

  return suitable[0];
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

export function buildStakingRoute(
  amount: string,
  riskPreference: string
): StakingRoute {
  const config = loadStakingConfig();

  if (!amount || amount === "0") {
    throw new Error("Amount must be greater than 0");
  }

  const target = selectTargetForRisk(riskPreference, amount);

  const warnings: string[] = [];
  if (riskPreference === "aggressive") {
    warnings.push(
      "Higher risk may result in lower returns or increased slashing risk"
    );
  }

  const riskNotes = Object.entries(config.risks)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value}`);

  return {
    action: "stake",
    target: target.address,
    targetLabel: target.name,
    amount,
    reason: `Route CSPR stake to ${target.name} (${target.type}). ${target.description}`,
    riskNotes,
    estimatedYield: target.estimatedYield,
    warnings,
  };
}

export function getStakingConfig(): StakingConfig {
  return loadStakingConfig();
}

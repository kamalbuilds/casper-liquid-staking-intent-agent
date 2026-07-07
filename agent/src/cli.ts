import dotenv from "dotenv";
import { runIntent } from "./agent.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: tsx src/cli.ts <intent_text>");
    console.log('Example: tsx src/cli.ts "earn safely on 10 CSPR"');
    process.exit(1);
  }

  const intentText = args.join(" ");

  try {
    const policyPath = path.join(__dirname, "../demo-policy.json");
    const policy = JSON.parse(fs.readFileSync(policyPath, "utf-8"));

    console.log("=========================================");
    console.log("Liquid Staking Intent Agent - CLI");
    console.log("=========================================\n");

    console.log(`Intent: "${intentText}"`);
    console.log("\n----- Policy -----");
    console.log(`Max Amount: ${policy.maxAmountLabel}`);
    console.log(`Allowed Target: ${policy.allowedTargetLabel}`);
    console.log(`Expiry: ${policy.expiryLabel}`);
    console.log(`Revoked: ${policy.revoked}`);

    console.log("\n----- Processing -----");
    const decision = await runIntent(intentText, policy);

    console.log("\n----- Route Proposal -----");
    console.log(`Action: ${decision.route.action}`);
    console.log(`Target: ${decision.route.targetLabel}`);
    console.log(`Target Address: ${decision.route.target}`);
    console.log(`Amount: ${decision.route.amount} motes`);
    console.log(`Reason: ${decision.route.reason}`);
    console.log(`Estimated Yield: ${decision.route.estimatedYield}`);

    if (decision.route.riskNotes.length > 0) {
      console.log(`\nRisk Notes:`);
      decision.route.riskNotes.forEach((note) => console.log(`  - ${note}`));
    }

    if (decision.route.warnings.length > 0) {
      console.log(`\nWarnings:`);
      decision.route.warnings.forEach((w) => console.log(`  - ${w}`));
    }

    console.log("\n----- Policy Evaluation -----");
    console.log(`Allowed: ${decision.verdict.allowed}`);
    console.log(`Reason: ${decision.verdict.reason}`);
    if (decision.verdict.violatedRule) {
      console.log(`Violated Rule: ${decision.verdict.violatedRule}`);
    }

    if (decision.explanation) {
      console.log(`\nExplanation: ${decision.explanation}`);
    }

    console.log("\n=========================================");
    console.log(
      decision.verdict.allowed
        ? "RESULT: ACTION ALLOWED"
        : "RESULT: ACTION BLOCKED"
    );
    console.log("=========================================\n");

    process.exit(decision.verdict.allowed ? 0 : 1);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();

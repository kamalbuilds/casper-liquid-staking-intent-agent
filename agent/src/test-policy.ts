import { evaluate, policyToString, type Policy } from "./policy.js";
import { buildStakingRoute } from "./routes.js";

console.log("=========================================");
console.log("Policy Evaluation Test Suite");
console.log("=========================================\n");

const demoPolicy: Policy = {
  agent: "0199c6c70c88b8edd07a1fc2f63ee8b8bf0e4d5b8f",
  maxAmount: "10000000000",
  allowedTarget: "02025eb40c970e6819f4ffa4c47b4a45c9c9f4d21e",
  expiry: 2147483647,
  revoked: false,
};

console.log("Demo Policy:");
console.log(policyToString(demoPolicy));
console.log("\n");

console.log("=========================================");
console.log("Test 1: Allowed Action (Within Limits)");
console.log("=========================================");

try {
  const route1 = buildStakingRoute("5000000000", "moderate");
  console.log(`\nBuilt route:`);
  console.log(`  Target: ${route1.targetLabel} (${route1.target})`);
  console.log(`  Amount: ${route1.amount} motes`);
  console.log(`  Reason: ${route1.reason}`);

  const result1 = evaluate(
    { target: demoPolicy.allowedTarget, amount: route1.amount },
    demoPolicy
  );

  console.log(`\nPolicy evaluation (using policy's allowed target):`);
  console.log(`  Allowed: ${result1.allowed}`);
  console.log(`  Reason: ${result1.reason}`);
  console.log(`\nTEST 1 RESULT: ${result1.allowed ? "PASS" : "FAIL"}`);
} catch (err) {
  console.error("TEST 1 FAILED:", err);
  process.exit(1);
}

console.log("\n");
console.log("=========================================");
console.log("Test 2: Blocked Action (Over Limit)");
console.log("=========================================");

try {
  const overLimitAmount = "50000000000";
  console.log(`\nAttempting stake of ${overLimitAmount} motes (50 CSPR) to allowed target`);
  console.log(`Policy max: ${demoPolicy.maxAmount} motes (10 CSPR)`);

  const result2 = evaluate(
    { target: demoPolicy.allowedTarget, amount: overLimitAmount },
    demoPolicy
  );

  console.log(`\nPolicy evaluation:`);
  console.log(`  Allowed: ${result2.allowed}`);
  console.log(`  Reason: ${result2.reason}`);
  console.log(`  Violated Rule: ${result2.violatedRule}`);

  if (result2.details) {
    console.log(`\nDetails:`);
    console.log(`  Requested: ${result2.details.requestedAmount} motes`);
    console.log(`  Max Allowed: ${result2.details.maxAllowedAmount} motes`);
  }

  console.log(
    `\nTEST 2 RESULT: ${!result2.allowed && result2.violatedRule === "AmountExceedsLimit" ? "PASS (correctly blocked)" : "FAIL"}`
  );
} catch (err) {
  console.error("TEST 2 FAILED:", err);
  process.exit(1);
}

console.log("\n");
console.log("=========================================");
console.log("Test 3: Wrong Target");
console.log("=========================================");

try {
  const wrongTarget = "0199c6c70c88b8edd07a1fc2f63ee8b8bf0e4d5b8f";
  const result3 = evaluate(
    {
      target: wrongTarget,
      amount: "5000000000",
    },
    demoPolicy
  );

  console.log(`\nRequest to unauthorized target: ${wrongTarget}`);
  console.log(`\nPolicy evaluation:`);
  console.log(`  Allowed: ${result3.allowed}`);
  console.log(`  Reason: ${result3.reason}`);
  console.log(`  Violated Rule: ${result3.violatedRule}`);

  console.log(
    `\nTEST 3 RESULT: ${!result3.allowed ? "PASS (correctly blocked)" : "FAIL"}`
  );
} catch (err) {
  console.error("TEST 3 FAILED:", err);
  process.exit(1);
}

console.log("\n");
console.log("=========================================");
console.log("All Tests Complete");
console.log("=========================================\n");

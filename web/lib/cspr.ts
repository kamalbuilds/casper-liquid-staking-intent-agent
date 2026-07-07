// Real casper-js-sdk helpers: motes/CSPR conversion, address parsing, and
// building the on-chain `execute_intent` transaction. No mocked signing paths.
import {
  Args,
  CLValue,
  ContractCallBuilder,
  Key,
  PublicKey,
  Transaction,
} from "casper-js-sdk";

export const MOTES_PER_CSPR = 1_000_000_000n;

/** UI sentinel for "no expiry" (unix seconds). Matches PolicyPanel blank expiry. */
export const NO_EXPIRY_SECONDS = 2_147_483_647;

const U64_MAX = "18446744073709551615";

/**
 * Converts policy expiry from unix seconds (UI / agent) to block-time
 * milliseconds (on-chain `set_policy` / `Policy.expiry`).
 */
export function expirySecondsToMs(seconds: number): string {
  if (seconds >= NO_EXPIRY_SECONDS) {
    return U64_MAX;
  }
  return String(seconds * 1000);
}

/** Converts a decimal CSPR string ("10", "10.5") to a motes string. */
export function csprToMotes(cspr: string): string {
  const trimmed = cspr.trim();
  if (!trimmed) {
    throw new Error("Amount is required");
  }
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  if (!/^\d*$/.test(wholeRaw) || !/^\d*$/.test(fracRaw)) {
    throw new Error(`Invalid CSPR amount: ${cspr}`);
  }
  const whole = wholeRaw === "" ? 0n : BigInt(wholeRaw);
  const frac = fracRaw.padEnd(9, "0").slice(0, 9);
  const fracMotes = frac === "" ? 0n : BigInt(frac);
  return (whole * MOTES_PER_CSPR + fracMotes).toString();
}

/** Converts a motes string to a trimmed decimal CSPR string. */
export function motesToCspr(motes: string): string {
  const value = BigInt(motes);
  const whole = value / MOTES_PER_CSPR;
  const frac = value % MOTES_PER_CSPR;
  if (frac === 0n) {
    return whole.toString();
  }
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

/** Truncates a long hex string for display: "0123...cdef". */
export function truncateMiddle(value: string, front = 8, back = 6): string {
  if (value.length <= front + back + 3) {
    return value;
  }
  return `${value.slice(0, front)}...${value.slice(-back)}`;
}

/** SHA-256 hex digest of arbitrary text, computed via WebCrypto (no fake hashing). */
export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Resolves a Casper target address string into a `Key`.
 * Accepts either an already-prefixed key ("account-hash-...", "hash-...",
 * "uref-...") or a raw hex-encoded public key, from which the account hash
 * is derived. Throws on malformed input rather than silently guessing.
 */
export function targetHexToKey(target: string): Key {
  const trimmed = target.trim();
  if (
    trimmed.startsWith("account-hash-") ||
    trimmed.startsWith("hash-") ||
    trimmed.startsWith("uref-") ||
    trimmed.startsWith("contract-") ||
    trimmed.startsWith("addressable-entity-")
  ) {
    return Key.newKey(trimmed);
  }
  const publicKey = PublicKey.fromHex(trimmed);
  const accountHash = publicKey.accountHash();
  return Key.newKey(accountHash.toPrefixedString());
}

/** Strips known display prefixes from a contract hash before use with ContractCallBuilder. */
function normalizeContractHash(contractHash: string): string {
  return contractHash
    .trim()
    .replace(/^hash-/, "")
    .replace(/^contract-/, "");
}

export interface BuildSetPolicyParams {
  ownerPublicKeyHex: string;
  contractHash: string;
  agentHex: string;
  maxAmountMotes: string;
  allowedTargetHex: string;
  expirySeconds: number;
  chainName?: string;
  paymentMotes?: number;
}

/**
 * Builds a real, unsigned `set_policy` contract-call transaction. The owner
 * signs it via CSPR.click before the agent can call `execute_intent`.
 * Expiry is converted from UI seconds to on-chain milliseconds.
 */
export function buildSetPolicyTransaction(
  params: BuildSetPolicyParams
): Transaction {
  const {
    ownerPublicKeyHex,
    contractHash,
    agentHex,
    maxAmountMotes,
    allowedTargetHex,
    expirySeconds,
    chainName = "casper-test",
    paymentMotes = 3_000_000_000,
  } = params;

  const callerPublicKey = PublicKey.fromHex(ownerPublicKeyHex);
  const agentKey = targetHexToKey(agentHex);
  const allowedTargetKey = targetHexToKey(allowedTargetHex);

  const args = Args.fromMap({
    agent: CLValue.newCLKey(agentKey),
    max_amount: CLValue.newCLUInt512(maxAmountMotes),
    allowed_target: CLValue.newCLKey(allowedTargetKey),
    expiry: CLValue.newCLUint64(expirySecondsToMs(expirySeconds)),
  });

  return new ContractCallBuilder()
    .from(callerPublicKey)
    .byHash(normalizeContractHash(contractHash))
    .entryPoint("set_policy")
    .runtimeArgs(args)
    .chainName(chainName)
    .payment(paymentMotes)
    .build();
}

export interface BuildExecuteIntentParams {
  callerPublicKeyHex: string;
  contractHash: string;
  targetHex: string;
  amountMotes: string;
  intentHash: string;
  chainName?: string;
  paymentMotes?: number;
}

/**
 * Builds a real, unsigned `execute_intent` contract-call transaction against
 * the deployed IntentPolicy contract. The caller signs it via CSPR.click.
 */
export function buildExecuteIntentTransaction(
  params: BuildExecuteIntentParams
): Transaction {
  const {
    callerPublicKeyHex,
    contractHash,
    targetHex,
    amountMotes,
    intentHash,
    chainName = "casper-test",
    paymentMotes = 3_000_000_000,
  } = params;

  const callerPublicKey = PublicKey.fromHex(callerPublicKeyHex);
  const targetKey = targetHexToKey(targetHex);

  const args = Args.fromMap({
    target: CLValue.newCLKey(targetKey),
    amount: CLValue.newCLUInt512(amountMotes),
    intent_hash: CLValue.newCLString(intentHash),
  });

  return new ContractCallBuilder()
    .from(callerPublicKey)
    .byHash(normalizeContractHash(contractHash))
    .entryPoint("execute_intent")
    .runtimeArgs(args)
    .chainName(chainName)
    .payment(paymentMotes)
    .build();
}

export function explorerDeployUrl(deployOrTxHash: string): string {
  return `https://testnet.cspr.live/deploy/${deployOrTxHash}`;
}

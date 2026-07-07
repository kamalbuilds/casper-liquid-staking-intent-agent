export const MOTES_PER_CSPR = 1_000_000_000n;

/** Decimal CSPR string ("10", "10.5") → motes string. */
export function csprToMotes(cspr: string): string {
  const trimmed = cspr.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid CSPR amount: ${cspr}`);
  }
  const [whole, frac = ""] = trimmed.split(".");
  const padded = (frac + "000000000").slice(0, 9);
  const motes = BigInt(whole) * MOTES_PER_CSPR + BigInt(padded);
  return motes.toString();
}

/** Unix seconds → contract block time (milliseconds). */
export function expirySecondsToMs(seconds: number): number {
  return seconds * 1000;
}

/** Contract block time ms → unix seconds for UI. */
export function expiryMsToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

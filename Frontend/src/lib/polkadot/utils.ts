import { isAddress } from "@polkadot/util-crypto";

export const HEX32_RE = /^0x[0-9a-fA-F]{64}$/;

export function isValidHex32(v: string) {
  return HEX32_RE.test(v.trim());
}

export function isValidSs58(v: string) {
  try { return isAddress(v.trim()); } catch { return false; }
}

export function fmtNumber(v: bigint | number | string) {
  try {
    const n = typeof v === "bigint" ? v : BigInt(v.toString());
    return n.toLocaleString("en-US");
  } catch {
    return String(v);
  }
}

export function shortAddr(a?: string | null, n = 6) {
  if (!a) return "—";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function safeStringify(obj: unknown) {
  return JSON.stringify(
    obj,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

export function hexToString(hex?: string | null): string {
  if (!hex) return "—";
  try {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    // Convert hex to bytes then to string
    const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return hex; // Fallback to original hex if decoding fails
  }
}

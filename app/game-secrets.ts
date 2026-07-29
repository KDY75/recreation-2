import {
  PARTICIPANT_IDS,
  PARTICLES,
  QUANTUM_STATES,
  type IdentityMap,
  type Particle,
  type QuantumState,
} from "./game-data";

const ENCRYPTED_IDENTITIES = {
  version: 1,
  iterations: 310000,
  salt: "QWLz19BHxApF5R1yZ9/OJA==",
  iv: "3n6staNlFMOKZ7gN",
  ciphertext:
    "3tjSbmILt0ax5Nhszv+4BQdaR8ocXEr+roILiItOzjW2eIix3SvKSQo2IY/OVEjIWCU8ytofy+Xh95d8VC6Nb0U0wRl9eaurjuxufkK4YPVdiinSjrZha+sWYt2CfuP4XI8F22WzY/2ICSzL/SQ5LNe51PyC4G5CVDWu5kHswnum1d38IRny5Z4Om3F4tbHyUwnWUon38hTYYMPyTMDOloOR96l/aVF7zdfHnQ5qPRt5om8viUqEyL+LZumSCs1ygnfKEshkOvyfrEqUDGfwFMNvfS47J++SquZXuEsifB1WgxC5ENmRlzJk4yk+dKWmHXQ6QJyZc9awBtCvgb64+7zGhEjrQIZJIywDA6zPs0zyjks3PszYlrcAgqo6NRetaV2Ia52EgzLXjxM6FaMWDOVUJrmN0fxkrp57XCYa3XB6eEcM7Rme34sW/fLl9YtGbdiTj6L/uN0MYBfXQKOdEfCcpX/QsxFM4c5ZJhasN5vAtVeU61UjqCCS3/H2zNZpHaUgccb6V25h4N9Zw0QEOWjKqSOa5QW7UMIGEXmd3hmvkXkmi21+9G1rLcmhWc/nvEUlF14FeLvq/wF8/9KcpiURMiuQnYPZprM1/oeBbaQMpmwTN0gfdASknKXI3LzAUiuUYsCYU3kwvS8bcguQ11S4ygHPEo2BgNWcy3QnH1WxGVYlpwaxu1NAGPz62fB/m6DmhHiDtNiWjgz2XMDJsYf1MCDRhICxMC2tcy8HoJ+y5TfwbN8WxTfQRhWDYqcj+uT/wlvUEVccjFa565Cs7r2/bnJ8q8T42byaMT28nPG8FNEVPnwJerFtvI6F5l8pre6Y8DnZKKmsnCuc+NxiDH+oCf6hXgP9tzobTiw/0I25OqJ82JeZIAc2aQWT+MDHvlXMbdM32vzqw+2zJ6W2FZkeIEVlavDULyskydhewjGfj9hxX26DFkIXLpPPaI0ST7tGaaacZ4JK5CJStGwgN7iKUDqmLU1O5L7A0A0xteRyrNmNUpA3Hlwf3byNG78dnPnK1Xed0A1bA8+sGszfFfwDcCLFOSZXtGd0pNNai0zfJz/h9RvfLC7mKZGKgLgsJFtZnivrnm26d1IlDtN02edTyH2FlAPiyTBFqryH/LUYk9cdBMkxGDZJLi/94y7Rl2HT34MePkxmxCd2qNNpu6H/sAhbK1l0U/ycxtCEVBtPNo4=",
} as const;

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isIdentityMap(value: unknown): value is IdentityMap {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<IdentityMap>;
  return PARTICIPANT_IDS.every((participant) => {
    const identity = candidate[participant];
    return (
      PARTICLES.includes(identity?.particle as Particle) &&
      QUANTUM_STATES.includes(identity?.state as QuantumState)
    );
  });
}

export async function decryptIdentities(password: string): Promise<IdentityMap> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(ENCRYPTED_IDENTITIES.salt),
      iterations: ENCRYPTED_IDENTITIES.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ENCRYPTED_IDENTITIES.iv),
    },
    key,
    fromBase64(ENCRYPTED_IDENTITIES.ciphertext),
  );
  const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  if (!isIdentityMap(parsed)) throw new Error("Invalid identity payload");
  return parsed;
}

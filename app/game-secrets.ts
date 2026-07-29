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
  salt: "nzn5s3BDXkEnctUQi4dqRQ==",
  iv: "lSaGBpQmXrsm5rfN",
  ciphertext:
    "Tk35JQSS0HwT3USEoR1efnSDdLRLKgc6Bb5O8/4p194vFTh3zqml9rPHiCR2kBxLNzwXzKZ64KLgqWvgEi7NBBoB6B/Mh983UYG2d4vtimoOe1mScqwWIcpY+/c5OVf/Gyb+6M3FBf4sgldbALZ8ONGUfzld+MJjDWq8bdJAjMAw+xT5Nf3nww+CH6UU8SaVgwEdP50FlH/8d9jGpAcYGaXOLfj5KH3y9OEN23sl8r5CGz3yVh/56fE8NlAUAoCqOhwKXh2dhu39C9i9K4m9jjY2xTv/mI3GzBuCFaQimmt7aKTYezgls4bhpOE/7ArsfXVUW1+B4nqmL0uZ2zApsAjF9zLlo1nYPZLerdE5N8X5ozrA2P420vwdGF/t1kOugSIUJXkWIKl/vQehqUwL0e+40U0vXfbEFyM1o43yvzmL4A79CnSOMRvmZXMmEHVo8bFkdmwtXH/xAtUm3Zg+K0Hkk8hgYRfF5NevgSY/haJ0xvN76B0uxvdud3w+cgNr2UJqJphOM9AUX/Rl8l3Du9ciKhlXVZsc9icgrLPG3PCKVGaiQW6v+rdvlpBqAjNs4H4gDO2CPJNYoWdDAUtaA90rfH5ZvKO+Lci20LyO6w+srPGB6Ue7pz8BXYbx3Mk272IGkSa+NKpIL4myr849z6kuLhW/U9/XTqKVe/OLTnvLzh9IKMAHzZ+S96BoxF+OlGkJaA0liEey0yFr6jkUqb36skeUXDiflz8pWMtQPbKVpUTqt7KsYZDdvp481lEWJGenqFEDV4MutyciAQTyUS228aiXkiEYBFEcYxG2pI5JmKfD58MG/DK6LeF+W96OLnoh6rrbheUSnl6sfHNRcUg7BUWcba9QUpD4IfPQW6HgMIWaU+wz83AGq/Pr9wdWJ9am01Kqqnlya+ZJ/wxqtfPSOLYOrPV5yiA1QzsQbO1OnXD8To1dZa4heQgbniM73o6ofK5FADT0uw5EGnjruLImNZTx97n8jveULh0OKu0sbdk4vLarL5SRaga5hLaQ6AGBdPJzKg4F8xCV71ufxVf8sn8IJwEV1LLFbdpgyinnbYOjZzF9p2XTn4PzDSMliEkiQjkiInQ3dh07aT0oFqINdi7U+qrVATDeXli10U6xmtp5uvoflwibSlJ67VHsGdbQ4CBFbs4w0BmGhVXaft29nCuTtfKHnX8FfA41BityTJs=",
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

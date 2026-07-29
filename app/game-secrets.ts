import CryptoJS from "crypto-js";

import {
  PARTICIPANT_IDS,
  PARTICLES,
  QUANTUM_STATES,
  type IdentityMap,
  type Particle,
  type QuantumState,
} from "./game-data";

const ENCRYPTED_IDENTITIES = {
  version: 2,
  iterations: 120000,
  salt: "/jd1MlY6jgfXRmTK/IrUNA==",
  iv: "gwkO6mioUvT6txikjDw0yw==",
  ciphertext:
    "RY7RJ1nc2H5KAlhU126e/IRSD4HKCTUetdBOQUIIWPk/YP78yAgiioeEzKuu9WSGhSp8zoiEvv5An9HJB/iqzVoOX2C8Xk+bP3nXZBW2AzbsmV7XM9CS9z0HqclBE9RloN6DIYFxwyvE3eCwVNn/V4RoLiyLy9qD1aUnte85ZwOD32Debo0GUGz789N7R/5cnlteKwcWe6Uixdjsl6GgLWzy0sJNtheXoTDAk3REJ+qPW2wnKHWlClXnKBTxGTrAf9TG1TzZgr2eYIQbKpyVqTgBI+VtDixskWQtfFBh4evAh3YMaCyN2wZM/S8mUEW/q6rlj80K2eSTG/Yij95cejoYO2fSkm1cEcevYVJyuTd7qSDqnhzZ3ZxiCb9L1PcXXSTtnhjadQTGui2QjtKTU4lBPhM38MBQbwXRx4/gmZXhUApXJi8W2+f9gZJMyUFBMY9mWqpn+vsoggvAXmY8NxeOoEcu8I2+fQ2ui7R0Zja/pkaim6NF7EdaNmaJCTnGKPF09YXGdnEys3PJG0nsmTPTZTiV3U88sR1wlyUlav+UiUpwbS28pnEzHfyF3AB+AlnGP2spMmmBQYXhD+Z1xTTOVUFX9OXkx/yDCYS/H4mJu1oo6p4aB0tkHzEY4ddYYD2+Ctj7jR1XEx/b6pYq5dxNv2++NvDSCLjaysXZrID7I092gj14Z5KaLQj0Y7rJpAmGls6CsdmW7ghPzqmogpwBAAfcghdTdU79dm/QB3k+6KTL/IiDC7pCNfACkpPV88swFAhiCDd0+r4AGnIh/0Gx/T07AWWp/PhvRgCr/cuOdtmSo1MQ3FjGbuGW2olIvfzbF58ncHCdv5fdOImsg+d0lu3qmHj5oUScIMUq9yT/HiLiwdqI/LGxg8FuZtkwVEs2rEsjaZUViQqiiVyHR483ejXX65cIqD3uYgtOO6TDQK1bjoR7SwY3qvkB7v00z9Z/B6CZVXmot4QZHy99Qs5pEpZld/gF0jbrXoC0fcVje8D/Y1w9frJFTjIch2wKurWoCYHma/cNkiVOPcdwN8djaYMrL0DAO/VC0OieRxTHws9Ag+nlIl/FFtGBRaUiollZPkOey/YTbjwoD1dd08K1xykzNZDUZybVH6JZvlIvxQtiTg7DObf65wX9CrJMeeMNUTJxU549BhlXVjt8dYJrC7IVNoEzLd5ATtQA9BZwZiW/BayNs7ZUiVCE8Gncbfbg+OI6r4NCKi6lRNTnHfobdhxLTUjpXQMhrlpSYQroEIUOgl6adRrUYNzG8D/EXXIkn+KtObw3/zpPyRQ0ApUhGKeCmg5kOUYFklVsZjpc6CI4ZWVAlJpZjeaKF8To5Fn4yLQjI0/PxdHm9ocXmA==",
  mac: "yD9JkE4GRy5fXPyXvtkO28drvD6Jk062TRpRgBCfJVI=",
} as const;

const ENCRYPTED_BALANCED_IDENTITIES = {
  version: 2,
  iterations: 120000,
  salt: "4UHSteEAdnQOK+AVis7p2w==",
  iv: "5oGmzEjEZeajqO3X4yWZag==",
  ciphertext:
    "zcSKk3zNtpYznG5nzeFHEJCclwGNkVbJF9Vt863mEmauWdgjxEymz+fAk3UfS5zzIQ9dRrBivHOdA5xtYHf+C6mHAveBgT47aH9U/1AZIiC/51C8CNOEttDhnA1Cf/olf8hyWRK4HdNuv+GuQ90u7HYdaqZVKXnr6Vg5TWlW8+98MtXHtGJZ+wQVlgwIKDRFXpAeqIoZVTrULiDcFyGpNbOfwtCx/izA8pt+P33JMtknCsDhJvSz17SCBgMsM3O9jaLV6ms2hTD8plTSEppGjV3npcubwr/FYbP0UHbZXZ6R0iRuO7xzDYNeVSPFkdCjV6318ZGgy+e6/Eig1ugmk28gVDJWS59t+AzQaa9xDeSL5pdgEcogqsoQnJwwTKlVbCvnRGN1voI0Tbqaqy42i28CRzhQpPbyAthIJ9MWRX0bbN+baOhUQVU9GxBAWHu1joBKiY37fmeEl5SzgF5IRKPfclT37gB0V0BShimqHY+ZGM6UH2w4pq8c3mVJhtCJTs6TpDURlMT+9yWSKoIF4gOB9qqk6Vlw7zyFks/N08Orq1S4nHeHDqsvbr5IyGciy3su6H0gYWsGX+a7k62TE69rP8kc24O5Eqf82Acz9ztgblgOfie4fz/N990gptWH+h9QU8rHYKKOtWxOp3g+865iCfpcnUtKHtVA1+In0u1LCxU10oAaUQmUAXRGvsr3AsRRNookIDtc4w57/JkhEzFO6Rn+uvCiNCluA4EHyOt9g++ypPu9PlOMAl5CIWstX387uETE69YbzHMdjou68vbXQzhodq4UlQT6mEDHncUyPrlAvOTfjB1vEwRdWJMV/NK0fvXviWqxHr4i4dtqchqW8zH9U8Qkdbp1oAvnORsdLiSb0/cGH4Y9o4Rpo8+2c8vSCfaMjLNysRL2REE2dFhe5nQcNMS03Enx0rV3AAT+ZtTS54DuOonkRxmlG6Ww5U0BrYbTucOMzQURjmaupBk3JaP25o0nYlXNGnr683NqAIsmrKMcLalcWnlYRpr+10w4T7HCY1BWRu2IxVhuz9EQzYvOX6YMA38/UfxhHwN9vhWiHG4bPvmvKOuTbZMs2l742F/M+WdM0SQK4HoHb69LvR1Z6E7WvGFhSEudcwyJVbpuHb8BX9+xv0VjMWW5RrYM/ldN7dk9cyR5xnj8YeJoCsaUlsXz1qrkwBzgmWkAtNlARbnzNgit00iaw5Lomb1eDn8rfxq5E51Euqlwvd5s1keTn/k3XRQNTVjt8egGhMuhmVFp6GFtzAwGe9iOnqH/fWLgrzR8bUZ4mCIB6m7ciwvPy54xZ743WgHInsZtk0F9Zmcy0+LEZFn/Y1XVmelq6fBVmgeW/wXbm+QABA==",
  mac: "4dUz7UTO144/sb+skds7bMU3tpQKMT0TY9F6KhI3MA0=",
} as const;

type EncryptedIdentityPayload = {
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  mac: string;
};

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

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function decryptIdentityPayload(
  payload: EncryptedIdentityPayload,
  password: string,
): Promise<IdentityMap> {
  await Promise.resolve();

  const salt = CryptoJS.enc.Base64.parse(payload.salt);
  const iv = CryptoJS.enc.Base64.parse(payload.iv);
  const ciphertext = CryptoJS.enc.Base64.parse(payload.ciphertext);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: payload.iterations,
    hasher: CryptoJS.algo.SHA256,
  });
  const actualMac = CryptoJS.HmacSHA256(
    iv.clone().concat(ciphertext),
    key,
  ).toString(CryptoJS.enc.Base64);

  if (!constantTimeEqual(actualMac, payload.mac)) {
    throw new Error("Invalid password");
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error("Invalid identity payload");

  const parsed = JSON.parse(plaintext) as unknown;
  if (!isIdentityMap(parsed)) throw new Error("Invalid identity payload");
  return parsed;
}

export function decryptIdentities(password: string): Promise<IdentityMap> {
  return decryptIdentityPayload(ENCRYPTED_IDENTITIES, password);
}

export function decryptBalancedIdentities(
  password: string,
): Promise<IdentityMap> {
  return decryptIdentityPayload(ENCRYPTED_BALANCED_IDENTITIES, password);
}

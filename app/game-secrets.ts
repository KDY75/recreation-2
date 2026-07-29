import CryptoJS from "crypto-js";

import {
  PARTICIPANT_IDS,
  PARTICLES,
  QUANTUM_STATES,
  type IdentityMap,
  type Particle,
  type QuantumState,
} from "./game-data.ts";

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
  salt: "ryQPTi/uXgiIqDkNDm8NTA==",
  iv: "8WuDrAQaXXMH7Q1UA0yIcA==",
  ciphertext:
    "3vmR5uWIJuZbchJg5sjFL+TNFJA+7qYMRq6hBYmbc4arKnMbVKfg1blbzlSp+j5+ImW2GVgZQlFgLqM0v9hVEuTFSt1O1IZuxS1fCeQViyo35uMg22jF4LUTnkvltjgvbjI/0dNuj01SGdxipwhGX/JIwNDKlRuVvJnaxs0Yx8BBw5Y860TXKUpWmfGc2pwYJc3THt3UKV4rMxcvi9uEjWqj3HCF07R9/3PAyPCUhlBHgfxIiXq3nkLEZ9c2CeCXOxtl20Oex4asSnNEhhhToeHgqEeYq5iPJgSrBUzLhI/9kiEC3Ic2uNX+Sok5uPRinkPPb+Jp/itQl53OOLIzjOw2NKDZ4SkWc+YlLa3i5mIWyn30DSNqYvrYjdhvxXzRv1vFNW9vEO+idsP+bx9bxF7ieUjS2yvX7Aeadw2YpYq4G/TSOIrvMP/9IBrteY84dOuxORDhA//0LFOoaM1wc25fU5piE7J5RgrSTbfUTieCylvDWsvAKpQPZoOcDL3uHEEuW7KzJTuehCvE15blPMvRNz2gJqcuI3jHjrdJ7POfjelaQDfHB+xGozx8XRSssWlAHNb3+RDNDcMe75Aqs7aVBmskjJuhwTtSu335A6dLqDkGXa4pXhR8+NdrrqEl2Z7zC9y0zOPkIv02eXoSPi+UFUlkitQMLmOMgb5tdGryiGqZ+WuQwPWk7Gvon0Gsd0dvjjiweScL9XEiK2uiJCluFfMIfRuBAzwxu6VO9YuW07izhu/6LjFEptBWGFXdxuivLEIRlGjdc68kIEhQUWsbuShkVuuejlA/1FETo8cL7gGH4BdPhRbUhqIagn9ggt4e/ghIMGZrUp1lo4ag1B5k8x0zIeWLyzpczd+LLjeTpaRo1Xiv7AJb5dS3dbROSz1nuaAYmVN56mO+TwyQvaWFTGwj4ybK/+5lE9HtqFfEDm3rM/3/B15mkN6zK6LXlf4DAk7qbTouOYDlVVPVlysg9kNLgOh9j3G/3vwud1PHuIeHmDH2S9qR+B542TGl34JNidCHoMd/quawdnQoa2T29xNcU/iW0Mvk5sX9qacsvStPPIpvc+LuXNFyPszY+k26Ug6u7XgStfvIYBQ9/EUPxpV3jYi7vgne9j0Qsc36NYuKZMc/L1gHI/AGbXPg/kXVjPmEXjP2YHihDZNIt/9Q8T1jwft44F2sROMqEDGhHJfgwlxHORWmQ6HR3FNWgZVugmpdhGF+B4pnJQJgfacKAFNUgDJLibIjBFXe3LW77IzDF8qPBoZWdqExo+nlW4hoBoAIvWPPeKHfgYzDp78cHGVNZ3fV/gaPd7p4FYHcm6Nmd49PTcbasDfERmB/6jF6jmQH30O4c3oZvZnRqw==",
  mac: "vEFAqcnGAcgh51qKqwj1A2lG0sfeaYmaCTjlMuFZZ0k=",
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

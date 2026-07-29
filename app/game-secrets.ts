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
  salt: "dqPCdPRt8imf4TGf5Lt9uw==",
  iv: "5bTs0h2vIp3Jou9cOraIww==",
  ciphertext:
    "V+aslWAS307DWCv/ndUIFqFfYIrnR4opKvGY24aeVgcsCnyXNKFFObn4dXKPuoyirGvFuwXOFJkAkcGbbZmEvTGk7lLy63g3rOFeH0lorcmuSWOGwVFWI8z5Fby/OB224HM+3N2+QMhvmhWrJ/0bz38b7SL8yg45PKQCDV6QvJR88O7AFN2vAORjUaMhpdOiMGRE3uh9GC4agZfWrRbwf9G4RXeGUFaybJg6KlSi8p5vAV9Vnwmm4aCEdH06Xdu7DinGRhaBkLcBRr/RzgTDzU56FL1TIM7zcp/gEk1L5PeIHcOzdLqwFYNb7eUeI6he32G6cMpXKpnesUdpOuXOktFXVJPKmzs6yxVZu6xuSGCOe7c7H8EK2CQk1Sa2VNIisGcYPFXTrvo1nRfKrLt4XrTxQjYkZf0ti2UkeZ4qBpjRithE/S8h6GMRbn8IwRRM98rWhJb1gHIGor/GNpSRJsJ0msziym1qNuR+J3Yk6iKfOhAZlq6Ge0IXhMbRbdt4Tj8vgbKNZEzAbKR8N/0ebbKmTgP+09L6pGCgbAk92cC2QLw5YSlHxPA/DTc13M301vJ54VCYgLTMzGWyGs15ZprLKhHA1Go0tV+zzkSWLNAH4smLwi4E4mZBuiBmQPxOSEz3oelNykTQuwMyP23TmzDDXAW79JasH4awCk/AlRbCJVHnjAVgRa5WfSJ4i5cRjI5fhkF/hcdn8FK7KFLMrlVrvtOX4+vQ8Xf9UUsCZUqMFGmD/cZ62CGvb0vSJHB7j4w/zjYS/KtHSEBPgMdebMNz1oyiRLs7fsYsTF3Ub7/xifRkuZVeO3EyP9PHGW91tjyZxRFilYf/90GpW1jV13aTqvXyrj8izc7J6oYdoGA6LJmf51UUVUv86TPCE2eRvF0krzS7uiMoun0LUZLpadO+jzSjZBIR5ZZMKFw6sGfw1VrkrkTXBfpC4EZEHYp7SbgEvz0Ls5jFhjJGKQH3/gBd/JspAFRYnhU7bnpJLVK2zS7n3n9Ds7fBepaAzrQRmO4JzO0+AX7Wi2Vx9auJU5jnHGriuOGbxsu1IgRCZAXQU+uRCpu1KE6Fad/o3JEsRdvaYR7PCxqL5LnNAm1Bww42Ak2KRW1+YmI2fl0J3wJXIWNq9gUThAvhBlkgvlemUh1fsATSkOKEiNN0IGZ932VQvXzzD+SooIwOAC/gDVd52xbaHhG71FhdDTYvis3D8779njQlbSEGbY6IVQUms53rNZ+nf1JSmq9yHzddKGXR4GQ3wyQURmBKbiMKjE9tzGDR9zXiX/vV46KiGkRXhqtg5uIGueCw1zq+g5mFZadKWAoXXpzQFAhgIf21KxUsm1NOLtY8b60qaeXYWPKz/g==",
  mac: "XORT8rxoOhEEOgYtu3CVN90RbJ6N3V+lEJWbXjF8p1E=",
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

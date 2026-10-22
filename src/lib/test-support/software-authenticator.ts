import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

// A stand-in for a phone or laptop's passkey hardware, for tests. It makes real
// P-256 keys and produces real WebAuthn registration and assertion responses,
// so the server's verification code runs against genuine signatures.

const b64u = (buf: Uint8Array) => Buffer.from(buf).toString("base64url");
const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest();

// Just enough CBOR for a COSE key and an attestation object.
type CborValue = number | string | Uint8Array | Map<number | string, CborValue>;
function head(major: number, n: number): Buffer {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  if (n < 65536) return Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
  throw new Error("cbor value too large for this encoder");
}
function cbor(value: CborValue): Buffer {
  if (typeof value === "number") {
    return value >= 0 ? head(0, value) : head(1, -1 - value);
  }
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8");
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (value instanceof Uint8Array) {
    return Buffer.concat([head(2, value.length), Buffer.from(value)]);
  }
  const parts: Buffer[] = [head(5, value.size)];
  for (const [k, v] of value) parts.push(cbor(k), cbor(v));
  return Buffer.concat(parts);
}

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_BE = 0x08;
const FLAG_BS = 0x10;
const FLAG_AT = 0x40;

export type AuthenticatorOptions = {
  rpId: string;
  origin: string;
  userHandle: string;
  /** Mimic a synced passkey (backup eligible + backed up). */
  synced?: boolean;
};

export class SoftwareAuthenticator {
  readonly credentialId = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly x: Buffer;
  private readonly y: Buffer;

  constructor(private readonly opts: AuthenticatorOptions) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = privateKey;
    const jwk = publicKey.export({ format: "jwk" });
    this.x = Buffer.from(jwk.x!, "base64url");
    this.y = Buffer.from(jwk.y!, "base64url");
  }

  get id(): string {
    return b64u(this.credentialId);
  }

  private flags(extra = 0) {
    const sync = this.opts.synced ? FLAG_BE | FLAG_BS : 0;
    return FLAG_UP | FLAG_UV | sync | extra;
  }

  private clientData(type: "webauthn.create" | "webauthn.get", challenge: string, origin?: string) {
    return Buffer.from(
      JSON.stringify({ type, challenge, origin: origin ?? this.opts.origin, crossOrigin: false })
    );
  }

  register(
    options: PublicKeyCredentialCreationOptionsJSON,
    overrides: { origin?: string; rpId?: string } = {}
  ): RegistrationResponseJSON {
    const coseKey = cbor(
      new Map<number | string, CborValue>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, this.x],
        [-3, this.y],
      ])
    );
    const counter = Buffer.alloc(4);
    const idLength = Buffer.alloc(2);
    idLength.writeUInt16BE(this.credentialId.length);
    const authData = Buffer.concat([
      sha256(overrides.rpId ?? this.opts.rpId),
      Buffer.from([this.flags(FLAG_AT)]),
      counter,
      Buffer.alloc(16), // AAGUID: all zeros, as for a platform authenticator that doesn't attest
      idLength,
      this.credentialId,
      coseKey,
    ]);
    const attestationObject = cbor(
      new Map<number | string, CborValue>([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", authData],
      ])
    );
    return {
      id: this.id,
      rawId: this.id,
      type: "public-key",
      response: {
        clientDataJSON: b64u(this.clientData("webauthn.create", options.challenge, overrides.origin)),
        attestationObject: b64u(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }

  authenticate(
    options: PublicKeyCredentialRequestOptionsJSON,
    overrides: {
      counter?: number;
      origin?: string;
      rpId?: string;
      userHandle?: string;
      credentialId?: string;
    } = {}
  ): AuthenticationResponseJSON {
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(overrides.counter ?? 0);
    const authData = Buffer.concat([
      sha256(overrides.rpId ?? this.opts.rpId),
      Buffer.from([this.flags()]),
      counter,
    ]);
    const clientDataJSON = this.clientData("webauthn.get", options.challenge, overrides.origin);
    const signature = sign("sha256", Buffer.concat([authData, sha256(clientDataJSON)]), this.privateKey);
    const id = overrides.credentialId ?? this.id;
    return {
      id,
      rawId: id,
      type: "public-key",
      response: {
        authenticatorData: b64u(authData),
        clientDataJSON: b64u(clientDataJSON),
        signature: b64u(signature),
        userHandle: b64u(Buffer.from(overrides.userHandle ?? this.opts.userHandle)),
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }
}

export function tamper(base64url: string): string {
  const bytes = Buffer.from(base64url, "base64url");
  bytes[bytes.length - 1] ^= 0xff;
  return bytes.toString("base64url");
}

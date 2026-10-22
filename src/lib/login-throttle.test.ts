import { beforeAll, describe, expect, it } from "vitest";
import { isLocked, LIMITS } from "@/lib/login-throttle";
import {
  createDeviceToken,
  readCookie,
  verifyDeviceToken,
} from "@/lib/trusted-device";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
});

describe("isLocked", () => {
  const none = { pair: 0, ip: 0, email: 0 };

  it("allows normal use", () => {
    expect(isLocked(none, false)).toBe(false);
    expect(isLocked({ pair: 4, ip: 10, email: 24 }, false)).toBe(false);
  });

  it("locks a network after too many misses on one account", () => {
    expect(isLocked({ ...none, pair: LIMITS.pair.max }, false)).toBe(true);
    expect(isLocked({ ...none, pair: LIMITS.pair.max }, true)).toBe(true);
  });

  it("locks a network that tries many accounts", () => {
    expect(isLocked({ ...none, ip: LIMITS.ip.max }, true)).toBe(true);
  });

  it("locks unknown devices once an account is hit from everywhere, but not the owner's own device", () => {
    const spread = { ...none, email: LIMITS.email.max };
    expect(isLocked(spread, false)).toBe(true);
    expect(isLocked(spread, true)).toBe(false);
  });
});

describe("trusted device token", () => {
  it("verifies for the user it was issued to", () => {
    const token = createDeviceToken("user-1");
    expect(verifyDeviceToken(token, "user-1")).toBe(true);
  });

  it("rejects another user, tampering, and junk", () => {
    const token = createDeviceToken("user-1");
    expect(verifyDeviceToken(token, "user-2")).toBe(false);
    expect(verifyDeviceToken(token.slice(0, -2) + "xx", "user-1")).toBe(false);
    expect(verifyDeviceToken(`user-1.abc.${"A".repeat(43)}`, "user-1")).toBe(false);
    expect(verifyDeviceToken("not-a-token", "user-1")).toBe(false);
    expect(verifyDeviceToken(undefined, "user-1")).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createDeviceToken("user-1");
    process.env.AUTH_SECRET = "other-secret";
    expect(verifyDeviceToken(token, "user-1")).toBe(false);
    process.env.AUTH_SECRET = "test-secret";
  });

  it("reads a named cookie out of a header", () => {
    expect(readCookie("a=1; qd=abc.def.ghi; b=2", "qd")).toBe("abc.def.ghi");
    expect(readCookie("a=1", "qd")).toBeUndefined();
    expect(readCookie(null, "qd")).toBeUndefined();
  });
});

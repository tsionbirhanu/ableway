import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  finishPasskeyRegistrationAction,
  finishPasskeySignInAction,
  startPasskeyRegistrationAction,
  startPasskeySignInAction,
} from "@/app/(auth)/passkey-actions";
import {
  createAccountWithPasskey,
  passkeyMessages,
  saveSignUpPrefill,
  signInWithPasskey,
  takeSignUpPrefill,
} from "@/lib/passkeys/client";

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));
vi.mock("@/app/(auth)/passkey-actions", () => ({
  startPasskeyRegistrationAction: vi.fn(),
  finishPasskeyRegistrationAction: vi.fn(),
  startPasskeySignInAction: vi.fn(),
  finishPasskeySignInAction: vi.fn(),
}));

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  vi.mocked(browserSupportsWebAuthn).mockReturnValue(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const details = { name: "Meron", email: "meron@example.org" };
const creationOptions = { challenge: "c" } as never;
const requestOptions = { challenge: "r" } as never;
const deviceError = (name: string) => Object.assign(new Error(name), { name });

describe("createAccountWithPasskey", () => {
  it("runs start, device prompt, finish, and succeeds", async () => {
    vi.mocked(startPasskeyRegistrationAction).mockResolvedValue({
      ok: true,
      challengeId: "ch1",
      options: creationOptions,
    });
    vi.mocked(startRegistration).mockResolvedValue({ id: "cred" } as never);
    vi.mocked(finishPasskeyRegistrationAction).mockResolvedValue({ ok: true });

    expect(await createAccountWithPasskey(details)).toEqual({ ok: true });
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: creationOptions });
    expect(finishPasskeyRegistrationAction).toHaveBeenCalledWith("ch1", { id: "cred" });
  });

  it("says plainly when the device cannot make passkeys, without calling the server", async () => {
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(false);
    expect(await createAccountWithPasskey(details)).toEqual({
      ok: false,
      reason: "unsupported",
      message: passkeyMessages.unsupported,
    });
    expect(startPasskeyRegistrationAction).not.toHaveBeenCalled();
  });

  it.each(["NotAllowedError", "AbortError"])("treats %s as cancelled", async (name) => {
    vi.mocked(startPasskeyRegistrationAction).mockResolvedValue({
      ok: true,
      challengeId: "ch",
      options: creationOptions,
    });
    vi.mocked(startRegistration).mockRejectedValue(deviceError(name));
    const result = await createAccountWithPasskey(details);
    expect(result).toMatchObject({ ok: false, reason: "cancelled" });
    expect(finishPasskeyRegistrationAction).not.toHaveBeenCalled();
  });

  it("passes server messages and field errors through", async () => {
    vi.mocked(startPasskeyRegistrationAction).mockResolvedValue({
      ok: false,
      code: "invalid",
      message: "Some details need fixing.",
      fieldErrors: { phone: "Please say the phone number with the country code." },
    });
    expect(await createAccountWithPasskey(details)).toEqual({
      ok: false,
      reason: "invalid",
      message: "Some details need fixing.",
      fieldErrors: { phone: "Please say the phone number with the country code." },
    });
  });

  it("reports a taken email from the finish step", async () => {
    vi.mocked(startPasskeyRegistrationAction).mockResolvedValue({
      ok: true,
      challengeId: "ch",
      options: creationOptions,
    });
    vi.mocked(startRegistration).mockResolvedValue({ id: "cred" } as never);
    vi.mocked(finishPasskeyRegistrationAction).mockResolvedValue({
      ok: false,
      code: "email_taken",
      message: "This email already has an account. Please sign in instead.",
    });
    expect(await createAccountWithPasskey(details)).toMatchObject({ reason: "email_taken" });
  });
});

describe("server errors", () => {
  it("turn into a message the page can read aloud, not an unhandled error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(startPasskeyRegistrationAction).mockRejectedValue(
      new Error("relation does not exist"),
    );
    expect(await createAccountWithPasskey(details)).toEqual({
      ok: false,
      reason: "failed",
      message: passkeyMessages.failed,
    });
    vi.mocked(startPasskeySignInAction).mockRejectedValue(new Error("network down"));
    expect(await signInWithPasskey()).toMatchObject({ ok: false, message: passkeyMessages.failed });
  });
});

describe("signInWithPasskey", () => {
  beforeEach(() => {
    vi.mocked(startPasskeySignInAction).mockResolvedValue({
      ok: true,
      challengeId: "s1",
      options: requestOptions,
    });
  });

  it("signs in", async () => {
    vi.mocked(startAuthentication).mockResolvedValue({ id: "cred" } as never);
    vi.mocked(finishPasskeySignInAction).mockResolvedValue({ ok: true });
    expect(await signInWithPasskey()).toEqual({ ok: true });
    expect(finishPasskeySignInAction).toHaveBeenCalledWith("s1", { id: "cred" });
  });

  it("explains when no Ableway passkey is on this device", async () => {
    vi.mocked(startAuthentication).mockResolvedValue({ id: "cred" } as never);
    vi.mocked(finishPasskeySignInAction).mockResolvedValue({
      ok: false,
      code: "failed",
      message: "We could not check your passkey.",
    });
    expect(await signInWithPasskey()).toEqual({
      ok: false,
      reason: "failed",
      message: passkeyMessages.noPasskey,
    });
  });

  it("treats a dismissed prompt as cancelled", async () => {
    vi.mocked(startAuthentication).mockRejectedValue(deviceError("NotAllowedError"));
    expect(await signInWithPasskey()).toEqual({
      ok: false,
      reason: "cancelled",
      message: passkeyMessages.signInCancelled,
    });
  });

  it("passes rate limits through", async () => {
    vi.mocked(startPasskeySignInAction).mockResolvedValue({
      ok: false,
      code: "rate_limited",
      message: "Too many tries.",
    });
    expect(await signInWithPasskey()).toMatchObject({ reason: "rate_limited" });
  });
});

describe("sign-up prefill", () => {
  it("keeps only name and email, and can be read once", () => {
    saveSignUpPrefill({ ...details, password: "never" } as never);
    expect(store.get("ableway_signup_prefill")).not.toContain("never");
    expect(takeSignUpPrefill()).toEqual(details);
    expect(takeSignUpPrefill()).toEqual({});
  });

  it("ignores broken or hostile stored data", () => {
    store.set("ableway_signup_prefill", "{not json");
    expect(takeSignUpPrefill()).toEqual({});
    store.set("ableway_signup_prefill", JSON.stringify({ name: 5, email: ["x"] }));
    expect(takeSignUpPrefill()).toEqual({ name: undefined, email: undefined });
  });
});

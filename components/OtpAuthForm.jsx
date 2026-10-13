"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * Signing in with a one-time code: ask for a mobile number or an email
 * address (`channel` is "phone" or "email"), send it a code, check the code.
 * The same two steps serve sign-in and sign-up - someone with no account yet
 * is asked for the candidate's name alongside the code.
 */

const RESEND_AFTER_S = 30;
const OTP_LENGTH = 6;

const digits = (v) => v.replace(/\D/g, "");

export default function OtpAuthForm({ channel, text, callbackUrl }) {
  const byPhone = channel === "phone";
  const [to, setTo] = useState("");
  const [sent, setSent] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [wait, setWait] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const fail = (key) => {
    setError(text.errors[key] || text.errors.generic);
    setBusy(false);
  };

  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return fail(data.error);
      setIsNew(Boolean(data.isNew));
      setSent(true);
      setCode("");
      setWait(RESEND_AFTER_S);
      setBusy(false);
    } catch {
      fail("generic");
    }
  }

  async function verify() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn("otp", { redirect: false, channel, to, code, name });
      if (!result || result.error) {
        if (result?.error === "NameRequired") {
          setIsNew(true);
          return fail("name");
        }
        return fail(result?.error === "TooManyAttempts" ? "tooMany" : "otp");
      }
      // A full navigation, so every server-rendered part picks up the session.
      window.location.assign(callbackUrl);
    } catch {
      fail("generic");
    }
  }

  const onSubmit = (e) => {
    e.preventDefault();
    if (sent) verify();
    else sendCode();
  };

  const change = () => {
    setSent(false);
    setCode("");
    setError("");
  };

  const shown = byPhone ? `+91 ${digits(to).slice(-10)}` : to.trim();
  const ready = byPhone ? digits(to).length >= 10 : to.includes("@");

  return (
    <form onSubmit={onSubmit} noValidate>
      {!sent && byPhone && (
        <>
          <label className="field-label" htmlFor="auth-phone">
            {text.phone}
          </label>
          <div className="auth-phone">
            <span aria-hidden="true">+91</span>
            <input
              id="auth-phone"
              className="text-input"
              type="tel"
              inputMode="numeric"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoComplete="tel-national"
              maxLength={16}
              placeholder="98765 43210"
              required
            />
          </div>
          <p className="auth-hint">{text.phoneHint}</p>
        </>
      )}

      {!sent && !byPhone && (
        <>
          <label className="field-label" htmlFor="auth-otp-email">
            {text.email}
          </label>
          <input
            id="auth-otp-email"
            className="text-input"
            type="email"
            inputMode="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
          />
          <p className="auth-hint">{text.emailOtpHint}</p>
        </>
      )}

      {sent && (
        <>
          <p className="auth-sent">
            {text.otpSent.replace("{to}", shown)}{" "}
            <button type="button" className="linklike" onClick={change}>
              {text.change}
            </button>
          </p>

          <label className="field-label" htmlFor="auth-otp">
            {text.otp}
          </label>
          <input
            id="auth-otp"
            className="text-input auth-otp"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(digits(e.target.value).slice(0, OTP_LENGTH))}
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            autoFocus
            required
          />

          {isNew && (
            <>
              <label className="field-label auth-gap" htmlFor="auth-otp-name">
                {text.name}
              </label>
              <input
                id="auth-otp-name"
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
              <p className="auth-hint">{text.nameHint}</p>
            </>
          )}
        </>
      )}

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="btn auth-submit"
        type="submit"
        disabled={busy || (sent ? code.length !== OTP_LENGTH || (isNew && !name.trim()) : !ready)}
      >
        {busy ? text.working : sent ? text.verify : text.sendOtp}
      </button>

      {sent && (
        <p className="auth-switch">
          {wait > 0 ? (
            text.resendIn.replace("{n}", wait)
          ) : (
            <button type="button" className="linklike" onClick={sendCode} disabled={busy}>
              {text.resend}
            </button>
          )}
        </p>
      )}
    </form>
  );
}

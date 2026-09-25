"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ConfirmationResult, RecaptchaVerifier, User } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";
import InquiryInbox from "@/components/InquiryInbox";
import logoAsset from "../public/eumlantree-logo-clean.png";

type AuthKit = typeof import("firebase/auth");
const STAFF_PHONES = new Set(["+821042433383", "+821020387459"]);

function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/operation-not-allowed") return "Firebase가 이 프로젝트에서 휴대폰 로그인을 허용하지 않았습니다. 콘솔에서 현재 프로젝트(eumlantree)의 Phone 제공자 설정을 확인해 주세요.";
  if (code === "auth/unauthorized-domain") return "현재 접속 주소가 Firebase 인증 도메인에 등록되지 않았습니다. Authentication 설정의 승인된 도메인에 접속 도메인을 추가해 주세요.";
  if (code === "auth/captcha-check-failed") return "reCAPTCHA 확인에 실패했습니다. 승인된 HTTPS 도메인에서 다시 시도하거나 브라우저의 보안 문자 요청을 확인해 주세요.";
  if (code === "auth/network-request-failed") return "Firebase 또는 reCAPTCHA 서버에 연결하지 못했습니다. 네트워크와 브라우저의 추적 방지 설정을 확인해 주세요.";
  if (code === "auth/region-not-allowed") return "Firebase의 SMS 지역 정책에서 한국(+82)이 허용되어 있는지 확인해 주세요.";
  if (code === "auth/invalid-phone-number") return "휴대폰 번호 형식을 확인해 주세요.";
  if (code === "auth/invalid-verification-code") return "인증번호가 맞지 않습니다. 다시 확인해 주세요.";
  if (code === "auth/code-expired") return "인증번호가 만료됐습니다. 새 번호를 받아 주세요.";
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") return "인증 요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  return code ? `요청 실패 (${code}). Firebase 설정과 네트워크를 확인해 주세요.` : "요청을 완료하지 못했습니다. Firebase 설정과 네트워크를 확인해 주세요.";
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("phone-auth-timeout")), ms);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

function toE164(raw: string) {
  const value = raw.trim().replace(/[\s()-]/g, "");
  const digits = value.replace(/\D/g, "");
  if (/^01[016789]\d{7,8}$/.test(digits)) return `+82${digits.slice(1)}`;
  if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
  return null;
}

export default function PhoneAuth() {
  const [kit, setKit] = useState<AuthKit | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import("firebase/auth").then((authKit) => {
      if (!active) return;
      setKit(authKit);
      unsubscribe = authKit.onAuthStateChanged(authKit.getAuth(firebaseApp), setUser);
    }).catch(() => setError("Firebase Authentication을 불러오지 못했습니다."));
    return () => { active = false; unsubscribe?.(); verifier.current?.clear(); verifier.current = null; };
  }, []);

  function closeLogin() {
    verifier.current?.clear();
    verifier.current = null;
    setLoginOpen(false);
    setConfirmation(null);
    setCode("");
    setError("");
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kit) return;
    const formatted = toE164(phone);
    if (!formatted) { setError("휴대폰 번호를 확인해 주세요. 예: 010-1234-5678"); return; }
    setBusy(true); setError("");
    try {
      const auth = kit.getAuth(firebaseApp);
      auth.languageCode = "ko";
      verifier.current ??= new kit.RecaptchaVerifier(auth, "phone-send-button", { size: "invisible" });
      const result = await withTimeout(kit.signInWithPhoneNumber(auth, formatted, verifier.current), 30000);
      setConfirmation(result);
    } catch (reason) {
      verifier.current?.clear(); verifier.current = null;
      setError((reason as Error)?.message === "phone-auth-timeout"
        ? "인증 요청이 30초 동안 응답하지 않았습니다. 이 페이지를 새로고침하고, Firebase 승인 도메인과 네트워크의 reCAPTCHA 접속을 확인해 주세요."
        : friendlyError(reason));
    } finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation) return;
    setBusy(true); setError("");
    try {
      await confirmation.confirm(code.trim());
      closeLogin();
    } catch (reason) { setError(friendlyError(reason)); }
    finally { setBusy(false); }
  }

  async function logout() {
    if (!kit) return;
    await kit.signOut(kit.getAuth(firebaseApp));
  }

  const isStaff = !!user?.phoneNumber && STAFF_PHONES.has(user.phoneNumber);
  const footerBrand = (
    <>
      <img src={logoAsset.src} alt="" />
      <span>이음랜트리<small>EUMLANTREE</small></span>
    </>
  );

  return (
    <>
      {user ? (
        <div className="footer-auth-row">
          <a className="footer-brand" href="#home" aria-label="이음랜트리 홈">{footerBrand}</a>
          <div className="auth-nav">
            {isStaff && <InquiryInbox />}
            <button className="auth-nav-button" type="button" onClick={logout}>로그아웃</button>
          </div>
        </div>
      ) : (
        <button className="footer-brand footer-login-trigger" type="button" aria-label="담당자 휴대폰 로그인" title="담당자 로그인" onClick={() => { setLoginOpen(true); setError(""); }}>{footerBrand}</button>
      )}
      {loginOpen && !user && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLogin(); }}>
          <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="phone-login-title">
            <button className="dialog-close" type="button" aria-label="닫기" onClick={closeLogin}>×</button>
            <div className="eyebrow">EUMLANTREE ACCOUNT</div>
            <h2 id="phone-login-title">휴대폰으로 로그인</h2>
            <p className="dialog-intro">문자로 받은 인증번호로 로그인합니다.</p>
            {!confirmation ? (
              <form onSubmit={requestCode} className="dialog-form">
                <label htmlFor="login-phone">휴대폰 번호</label>
                <input id="login-phone" autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <p className="form-note">인증 문자가 발송될 수 있으며, 입력한 번호는 본인 확인과 Firebase의 스팸 방지에 사용됩니다. 문자 요금이 발생할 수 있습니다.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button id="phone-send-button" className="dialog-submit" type="submit" disabled={busy || !kit}>{busy ? "요청 중…" : "인증번호 받기"}</button>
                <div id="phone-recaptcha-container" />
              </form>
            ) : (
              <form onSubmit={verifyCode} className="dialog-form">
                <label htmlFor="login-code">문자로 받은 인증번호</label>
                <input id="login-code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="dialog-submit" type="submit" disabled={busy || code.length < 6}>{busy ? "확인 중…" : "로그인"}</button>
                <button className="dialog-secondary" type="button" onClick={() => { setConfirmation(null); setCode(""); setError(""); }}>전화번호 다시 입력</button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}



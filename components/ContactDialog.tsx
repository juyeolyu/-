"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { firebaseApp } from "@/lib/firebase";

type FormState = "idle" | "sending" | "sent" | "error";

export default function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === "#contact");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function close() {
    setOpen(false); setState("idle"); setError("");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending"); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const { addDoc, collection, getFirestore, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(getFirestore(firebaseApp), "inquiries"), {
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
        consent: form.get("consent") === "on",
        status: "new",
        createdAt: serverTimestamp(),
      });
      setState("sent");
      formElement.reset();
    } catch {
      setState("error");
      setError("접수가 되지 않았습니다. Firebase Firestore와 보안 규칙이 설정되어 있는지 확인해 주세요.");
    }
  }

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="dialog-card inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-title">
        <button className="dialog-close" type="button" aria-label="닫기" onClick={close}>×</button>
        <div className="eyebrow">PROJECT INQUIRY</div>
        <h2 id="inquiry-title">프로젝트 문의</h2>
        {state === "sent" ? (
          <div className="inquiry-success"><strong>문의가 접수됐습니다.</strong><p>남겨주신 연락처로 확인 후 연락드리겠습니다.</p><button className="dialog-submit" type="button" onClick={close}>닫기</button></div>
        ) : (
          <form className="dialog-form inquiry-form" onSubmit={submit}>
            <label htmlFor="inquiry-name">이름</label>
            <input id="inquiry-name" name="name" autoComplete="name" maxLength={80} required />
            <label htmlFor="inquiry-phone">전화번호</label>
            <input id="inquiry-phone" name="phone" autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" maxLength={30} required />
            <label htmlFor="inquiry-message">문의 내용</label>
            <textarea id="inquiry-message" name="message" rows={5} maxLength={4000} placeholder="공간과 필요한 네트워크 작업을 적어주세요." required />
            <label className="consent-row"><input type="checkbox" name="consent" required /><span>문의 응대를 위해 이름, 전화번호, 문의 내용을 수집·이용하는 데 동의합니다. 정보는 Firebase에 저장되어 상담에 사용됩니다.</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="dialog-submit" type="submit" disabled={state === "sending"}>{state === "sending" ? "접수 중…" : "문의 접수하기"}</button>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}



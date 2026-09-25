"use client";

import { useEffect, useState } from "react";
import { firebaseApp } from "@/lib/firebase";

type Inquiry = { id: string; name: string; phone: string; message: string; status: string; createdAt: Date | null };

function dateLabel(date: Date | null) {
  if (!date) return "방금";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function InquiryInbox() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stop: (() => void) | undefined;
    let active = true;
    setLoading(true); setLoadError(false);
    import("firebase/firestore").then(({ collection, getFirestore, limit, onSnapshot, orderBy, query }) => {
      if (!active) return;
      const q = query(collection(getFirestore(firebaseApp), "inquiries"), orderBy("createdAt", "desc"), limit(100));
      stop = onSnapshot(q, (snapshot) => {
        setItems(snapshot.docs.map((item) => {
          const data = item.data();
          return { id: item.id, name: data.name ?? "", phone: data.phone ?? "", message: data.message ?? "", status: data.status ?? "new", createdAt: data.createdAt?.toDate?.() ?? null };
        }));
        setLoading(false);
      }, () => { setLoadError(true); setLoading(false); });
    }).catch(() => { setLoadError(true); setLoading(false); });
    return () => { active = false; stop?.(); };
  }, [open]);

  async function markRead(item: Inquiry) {
    if (item.status !== "new") return;
    const { doc, getFirestore, updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(getFirestore(firebaseApp), "inquiries", item.id), { status: "read" });
  }

  return (
    <>
      <button className="auth-nav-button inbox-open" type="button" onClick={() => setOpen(true)}>문의 확인</button>
      {open && <div className="modal-backdrop inbox-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="dialog-card inbox-dialog" role="dialog" aria-modal="true" aria-labelledby="inbox-title">
          <button className="dialog-close" type="button" aria-label="닫기" onClick={() => setOpen(false)}>×</button>
          <div className="eyebrow">EUMLANTREE · INBOX</div><h2 id="inbox-title">문의 내역</h2>
          {loading && <p className="feed-status">문의 목록을 불러오는 중…</p>}
          {loadError && <p className="form-error">문의 내역을 불러오지 못했습니다. Firestore 보안 규칙을 배포했는지 확인해 주세요.</p>}
          {!loading && !loadError && !items.length && <p className="dialog-intro">아직 접수된 문의가 없습니다.</p>}
          <div className="inquiry-list">{items.map((item) => <article className="inquiry-item" key={item.id}>
            <div className="inquiry-item-head"><strong>{item.name}</strong><span>{dateLabel(item.createdAt)}</span></div>
            <a className="inquiry-phone" href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>{item.phone}</a>
            <p>{item.message}</p>
            {item.status === "new" && <button className="mark-read" type="button" onClick={() => void markRead(item)}>확인 완료</button>}
          </article>)}</div>
        </section>
      </div>}
    </>
  );
}

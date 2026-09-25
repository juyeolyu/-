"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Photo = { src: string; title: string; link: string };
type BlogPost = { title: string; link: string; pubDate: string; content: string };
type CompanyCases = { name: string; posts: BlogPost[] };
const POSTS_CACHE_KEY = "eumlantree-blog-posts-v1";
const PHOTOS_CACHE_KEY = "eumlantree-blog-photos-v2";

function summarize(posts: BlogPost[]) {
  const text = posts.map((post) => post.content).join(" ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?요다])\s+/).map((item) => item.trim()).filter(Boolean);
  const useful = sentences.filter((item) => /현장|사무실|공유오피스|랜케이블|배선|AP|무선|장비|통신실|네트워크|포설|이설|구축|설치|시공/.test(item) && !/안녕하세요|사람을 잇다|감사합니다|문의주세요|이음랜트리입니다/.test(item));
  const excerpt = (useful[0] || text).slice(0, 185);
  const work: string[] = [];
  if (/랜케이블|랜 케이블|랜공사|배선|포설/.test(text)) work.push("랜케이블 포설·배선 정리");
  if (/이설|이전|이동/.test(text)) work.push("기존 네트워크 장비 이설");
  if (/AP|무선|와이파이|Wi-Fi/i.test(text)) work.push("AP 설치·무선 환경 구성");
  if (/랙|통신실|단자함|허브|스위치|라우터/.test(text)) work.push("통신 장비·랙 구성");
  if (/테스트|테스터|점검|연결 상태/.test(text)) work.push("회선 테스트·연결 점검");
  if (/PC|컴퓨터|데스크탑/.test(text)) work.push("업무용 PC 네트워크 연결");
  return { excerpt, work: work.slice(0, 4) };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "시공 사례" : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function WorkSlideshow() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerScrollTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      const cached = localStorage.getItem(POSTS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { posts?: BlogPost[] };
        if (Array.isArray(data.posts)) {
          const projects = selectProjects(data.posts);
          setPosts(projects);
          setSelectedCompany(groupByCompany(projects)[0]?.name ?? "");
        }
      }
    } catch { /* Ignore an invalid or unavailable browser cache. */ }
    const load = async () => {
      try {
        const response = await fetch("/api/blog", { cache: "no-store" });
        if (!response.ok) throw new Error("블로그 글을 불러오지 못했습니다.");
        const data = await response.json();
        if (alive) {
          const projects = selectProjects(Array.isArray(data.posts) ? data.posts : []);
          try { localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ posts: data.posts })); } catch { /* Storage can be disabled or full. */ }
          setPosts(projects);
          setSelectedCompany((current) => groupByCompany(projects).some((company) => company.name === current) ? current : groupByCompany(projects)[0]?.name ?? "");
          setFailed(false);
        }
      } catch { if (alive) setFailed((current) => current && posts.length === 0); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15 * 60 * 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    let alive = true;
    try {
      const cached = localStorage.getItem(PHOTOS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { photos?: Photo[] };
        if (Array.isArray(data.photos)) setPhotos(data.photos);
      }
    } catch { /* Ignore an invalid or unavailable browser cache. */ }
    fetch("/api/blog/photos", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("사진을 불러오지 못했습니다."); return response.json(); })
      .then((data: { photos?: Photo[] }) => { if (alive) {
        const nextPhotos = data.photos ?? [];
        setPhotos(nextPhotos);
        try { localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify({ photos: nextPhotos })); } catch { /* Storage can be disabled or full. */ }
      } })
      .catch(() => { /* Keep the last successful photos in state when Naver is temporarily unavailable. */ });
    return () => { alive = false; };
  }, []);

  const companies = useMemo(() => groupByCompany(posts), [posts]);
  const companyCase = companies.find((company) => company.name === selectedCompany) ?? companies[0];
  const companyPosts = companyCase?.posts ?? [];
  const project = companyPosts[0];
  const projectPhotos = useMemo(() => {
    const links = new Set(companyPosts.map((post) => post.link));
    return photos.filter((photo) => links.has(photo.link));
  }, [photos, companyPosts]);
  const details = companyPosts.length ? summarize(companyPosts) : null;

  useEffect(() => { setActive(0); setPaused(false); }, [selectedCompany]);
  useEffect(() => {
    if (paused || projectPhotos.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % projectPhotos.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, projectPhotos.length, selectedCompany]);

  const move = (step: number) => setActive((index) => (index + step + projectPhotos.length) % projectPhotos.length);
  const photo = projectPhotos[active];

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && projectPhotos.length > 1) move(-1);
      if (event.key === "ArrowRight" && projectPhotos.length > 1) move(1);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, projectPhotos.length]);

  useEffect(() => {
    const picker = pickerRef.current;
    const selected = picker?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!picker || !selected) return;
    const pickerBounds = picker.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    const selectedCenter = selectedBounds.left + selectedBounds.width / 2;
    const pickerCenter = pickerBounds.left + pickerBounds.width / 2;
    picker.scrollTo({ left: picker.scrollLeft + selectedCenter - pickerCenter, behavior: "smooth" });
  }, [active, selectedCompany]);

  return <>
    <div className="work-copy">
      <div className="eyebrow">FIELD CASE · {project ? dateLabel(project.pubDate) : "EUMLANTREE"}</div>
      {companies.length > 0 && <div className="case-switcher" role="tablist" aria-label="업체별 시공 사례 선택">
        {companies.map((company) => <button key={company.name} type="button" role="tab" aria-selected={companyCase?.name === company.name} onClick={() => setSelectedCompany(company.name)}>{company.name}</button>)}
      </div>}
      {project && details ? <>
        <div className="case-heading"><h3>{companyCase?.name} 네트워크 시공 사례</h3><span>{companyPosts.length}개 현장 · 최근 {dateLabel(project.pubDate)}</span></div>
        <p className="case-intro">{details.excerpt || "현장 여건과 사용 환경을 확인해 필요한 네트워크 작업을 진행한 사례입니다."}</p>
        {details.work.length > 0 && <ul className="case-work-list">{details.work.map((item) => <li key={item}>{item}</li>)}</ul>}
        <div className="case-result"><span>통합 시공 사례</span><p>같은 업체의 시공 현장과 사진을 한곳에 모았습니다.</p></div>
        <div className="case-article-links" aria-label={`${companyCase?.name} 시공 글`}>
          {companyPosts.map((post) => <a key={post.link} href={post.link} target="_blank" rel="noreferrer">{post.title} · {dateLabel(post.pubDate)} ↗</a>)}
        </div>
      </> : <>
        <div className="case-heading"><h3>{failed ? "시공 사례를 불러오지 못했습니다." : "블로그 시공 사례"}</h3></div>
        <p className="case-intro">{failed ? "네이버 블로그 응답이 잠시 지연되고 있습니다. 잠시 후 다시 확인해 주세요." : "네이버 블로그에서 시공 사례를 불러오는 중입니다."}</p>
        <a className="case-original" href="https://blog.naver.com/eumlantree" target="_blank" rel="noreferrer">네이버 블로그 보기 ↗</a>
      </>}
    </div>
    <div className="work-diagram case-gallery">
      {photo ? <>
        <button type="button" className="work-photo-link" onClick={() => setLightboxOpen(true)} aria-label={`${photo.title} 현장 사진 크게 보기`}>
          <img key={photo.src} src={photo.src} alt={`${photo.title} 시공 현장 사진`} />
          <span className="work-photo-caption"><span>{photo.title} · 현장 사진</span><span>사진 크게 보기 ↗</span></span>
        </button>
        {projectPhotos.length > 1 && <>
          <button className="work-slide-arrow prev" aria-label="이전 현장 사진" onClick={() => move(-1)}>‹</button>
          <button className="work-slide-arrow next" aria-label="다음 현장 사진" onClick={() => move(1)}>›</button>
        </>}
        <div className="work-slide-controls">
          <span className="work-slide-count">사진 {String(active + 1).padStart(2, "0")} / {String(projectPhotos.length).padStart(2, "0")}</span>
          <div className="work-slide-actions">
            <button type="button" className="work-autoplay-toggle" aria-label={paused ? "자동 슬라이드 재생" : "자동 슬라이드 일시정지"} onClick={() => setPaused((value) => !value)}>{paused ? "▶ 재생" : "Ⅱ 일시정지"}</button>
            <span className="work-slide-hint">5초마다 자동 전환</span>
          </div>
        </div>
        <div className="work-photo-picker-shell">
        <div className="work-photo-picker-heading"><strong>현장 사진 목록 <span>{projectPhotos.length}장</span></strong><span className="work-photo-picker-hint">좌우 버튼 또는 스와이프로 넘겨보세요</span></div>
        <div className="work-photo-picker-viewport">
        <button type="button" className="work-picker-arrow prev" aria-label="사진 목록 이전 사진" onClick={() => move(-1)}>‹</button>
        <div ref={pickerRef} className="work-photo-picker" aria-label={`${companyCase?.name} 전체 현장 사진 ${projectPhotos.length}장`} onScroll={() => {
          if (pickerScrollTimer.current !== null) window.clearTimeout(pickerScrollTimer.current);
          pickerScrollTimer.current = window.setTimeout(() => {
            const picker = pickerRef.current;
            if (!picker) return;
            const pickerCenter = picker.getBoundingClientRect().left + picker.clientWidth / 2;
            const buttons = [...picker.querySelectorAll<HTMLButtonElement>("button")];
            let nearestIndex = 0;
            let nearestDistance = Number.POSITIVE_INFINITY;
            buttons.forEach((button, index) => {
              const bounds = button.getBoundingClientRect();
              const distance = Math.abs(bounds.left + bounds.width / 2 - pickerCenter);
              if (distance < nearestDistance) { nearestDistance = distance; nearestIndex = index; }
            });
            setActive((current) => current === nearestIndex ? current : nearestIndex);
          }, 90);
        }}>
          {projectPhotos.map((item, index) => <button
            type="button"
            key={item.src}
            aria-label={`${index + 1}번째 사진 선택`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
          >
            <img loading="lazy" src={item.src} alt={`${index + 1}번째 현장 사진 미리보기`} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>)}
        </div>
        <button type="button" className="work-picker-arrow next" aria-label="사진 목록 다음 사진" onClick={() => move(1)}>›</button>
        </div>
        </div>
      </> : <div className="work-slideshow-empty" role="status">{project ? "이 현장의 사진은 블로그 원문에서 확인하실 수 있습니다." : "현장 사진을 불러오는 중입니다…"}</div>}
    </div>
    {lightboxOpen && photo && <div className="work-lightbox" role="dialog" aria-modal="true" aria-label={`${photo.title} 현장 사진 크게 보기`} onClick={() => setLightboxOpen(false)}>
      <button type="button" className="work-lightbox-close" aria-label="사진 크게 보기 닫기" onClick={() => setLightboxOpen(false)}>×</button>
      {projectPhotos.length > 1 && <button type="button" className="work-lightbox-arrow prev" aria-label="이전 현장 사진" onClick={(event) => { event.stopPropagation(); move(-1); }}>‹</button>}
      <img src={photo.src} alt={`${photo.title} 시공 현장 사진`} onClick={(event) => event.stopPropagation()} />
      {projectPhotos.length > 1 && <button type="button" className="work-lightbox-arrow next" aria-label="다음 현장 사진" onClick={(event) => { event.stopPropagation(); move(1); }}>›</button>}
      <div className="work-lightbox-caption" onClick={(event) => event.stopPropagation()}>{photo.title} · 사진 {active + 1} / {projectPhotos.length}</div>
    </div>}
  </>;
}

function selectProjects(posts: BlogPost[]) {
  return posts.filter((post) => {
    if (!/공사|시공|완공|랜공사/.test(post.title) || /자주\s*묻는|FAQ|질문\s*TOP|TOP\s*5/i.test(post.title)) return false;
    const company = post.title.replace(/\s*(네트워크\s*)?(공사|시공|완공|랜공사).*$/i, "").trim();
    return company.length > 1 && !/^(랜선|사무실|네트워크)$/i.test(company);
  });
}

function groupByCompany(posts: BlogPost[]): CompanyCases[] {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const name = post.title.replace(/\s*(네트워크\s*)?(공사|시공|완공|랜공사).*$/i, "").trim();
    if (!name) continue;
    const existing = groups.get(name) ?? [];
    existing.push(post);
    groups.set(name, existing);
  }
  return [...groups].map(([name, items]) => ({ name, posts: items }));
}

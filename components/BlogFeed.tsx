"use client";

import { useEffect, useState } from "react";

type BlogPost = { title: string; link: string; pubDate: string; content: string };
const POSTS_CACHE_KEY = "eumlantree-blog-posts-v1";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function BlogFeed() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    let active = true;
    try {
      const cached = localStorage.getItem(POSTS_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { posts?: BlogPost[] };
        if (Array.isArray(data.posts)) setPosts(data.posts);
      }
    } catch { /* Ignore an invalid or unavailable browser cache. */ }
    const load = async () => {
      try {
        const response = await fetch("/api/blog", { cache: "no-store" });
        if (!response.ok) throw new Error("Blog feed request failed");
        const data = await response.json();
        if (active) {
          const nextPosts = Array.isArray(data.posts) ? data.posts : [];
          setPosts(nextPosts);
          try { localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ posts: nextPosts })); } catch { /* Storage can be disabled or full. */ }
          setError(false);
        }
      } catch {
        if (active) setError((current) => current && posts.length === 0);
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 15 * 60 * 1000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (error) {
    return <p className="feed-error">블로그 글을 불러오지 못했습니다. <a href="https://blog.naver.com/eumlantree" target="_blank" rel="noreferrer">네이버 블로그에서 확인해 주세요 ↗</a></p>;
  }
  if (!posts.length) return <p className="feed-status" aria-live="polite">블로그 글을 불러오는 중…</p>;

  return (
    <>
      <p className="feed-status" aria-live="polite">총 {posts.length}개의 글 · 새 글은 15분마다 자동 확인됩니다</p>
      <div className="post-list">
        {posts.slice(0, visibleCount).map((post) => (
          <details className="post-item" key={post.link}>
            <summary><span className="post-date">{formatDate(post.pubDate)}</span><span className="post-title">{post.title}</span><span className="post-toggle">＋</span></summary>
            <div className="post-content">{post.content || "본문 미리보기가 RSS에 포함되지 않았습니다."}<div className="post-actions"><a className="post-original" href={post.link} target="_blank" rel="noreferrer">네이버 블로그 원문 보기 ↗</a></div></div>
          </details>
        ))}
      </div>
      {posts.length > visibleCount && <div className="feed-more"><button type="button" onClick={() => setVisibleCount((count) => count + 6)}>글 더 보기</button></div>}
    </>
  );
}

import { NextResponse } from "next/server";

export const revalidate = 900;

type ProjectPost = { title: string; link: string };

function isProjectTitle(title: string) {
  if (!/공사|시공|완공|랜공사/.test(title) || /자주\s*묻는|FAQ|질문\s*TOP|TOP\s*5/i.test(title)) return false;
  const company = companyFromTitle(title);
  return company.length > 1 && !/^(랜선|사무실|네트워크)$/i.test(company);
}

function companyFromTitle(title: string) {
  return title.replace(/\s*(네트워크\s*)?(공사|시공|완공|랜공사).*$/i, "").trim();
}

function decodeXml(value: string) {
  return value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
}

function tagValue(block: string, name: string) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`<${safe}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safe}\\s*>`, "i"))?.[1]?.trim() ?? "";
}

function attrValue(tag: string, name: string) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\b${safe}=["']([^"']+)`, "i"))?.[1] ?? "";
}

function isLogoImage(src: string) {
  try {
    return /logo|로고/i.test(decodeURIComponent(new URL(src).pathname));
  } catch {
    return true;
  }
}

export async function GET() {
  try {
    const rssResponse = await fetch("https://rss.blog.naver.com/eumlantree.xml", {
      headers: { "User-Agent": "Mozilla/5.0 EUMLANTREE website" },
      next: { revalidate: 900 }, signal: AbortSignal.timeout(10000),
    });
    if (!rssResponse.ok) throw new Error("Naver RSS request failed");
    const rss = await rssResponse.text();
    const projects: ProjectPost[] = [...rss.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
      .map(([, block]) => ({
        title: decodeXml(tagValue(block, "title")).replace(/<[^>]+>/g, "").trim(),
        link: decodeXml(tagValue(block, "link")),
      }))
      .filter((post) => isProjectTitle(post.title) && /^https:\/\/blog\.naver\.com\//.test(post.link));

    const photos: { src: string; title: string; link: string }[] = [];
    const seenImages = new Set<string>();
    // Keep concurrency bounded so Naver does not throttle a burst of article requests.
    for (let offset = 0; offset < projects.length; offset += 5) {
      const batch = projects.slice(offset, offset + 5);
      const groups = await Promise.all(batch.map(async (post) => {
        try {
      const logNo = post.link.match(/\/(\d{10,})/)?.[1];
      if (!logNo) return [];
      const url = `https://blog.naver.com/PostView.naver?blogId=eumlantree&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&noTrackingCode=true&directAccess=false`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 EUMLANTREE website", Referer: post.link },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];
      const html = await response.text();
      const images = [...html.matchAll(/<img\b[^>]*>/gi)]
        .map(([tag]) => attrValue(tag, "data-lazy-src") || attrValue(tag, "src"))
        .filter((src) => /^https:\/\/postfiles\.pstatic\.net\//i.test(src))
        .filter((src) => !isLogoImage(src))
        .map((src) => src.replace(/\?type=[^&]+(?:&.*)?$/i, ""));
      return [...new Set(images)].map((src) => ({
        src: `/api/blog/image?quality=966&url=${encodeURIComponent(src)}`,
        title: post.title,
        link: post.link,
      }));
        } catch {
          // One unavailable article should not hide photos from the other projects.
          return [];
        }
      }));
      for (const photo of groups.flat()) {
        const originalSrc = new URLSearchParams(photo.src.split("?")[1] ?? "").get("url") ?? photo.src;
        if (!seenImages.has(originalSrc)) {
          seenImages.add(originalSrc);
          photos.push(photo);
        }
      }
    }

    return NextResponse.json({ photos, updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "현장 사진을 불러오지 못했습니다." }, { status: 502 });
  }
}

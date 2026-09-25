import { NextResponse } from "next/server";

export const revalidate = 600;

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ");
}

function plainText(value: string) {
  return decodeXml(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p\s*>|<\/div\s*>|<\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*\n\s*/g, "\n").replace(/[ \t]+/g, " ")
    .trim();
}

function tagValue(block: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedName}\\s*>`, "i"));
  return match?.[1]?.trim() ?? "";
}

export async function GET() {
  try {
    const response = await fetch("https://rss.blog.naver.com/eumlantree.xml", {
      headers: { "User-Agent": "EUMLANTREE-Website/1.0 (public Naver Blog RSS reader)" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Naver RSS returned ${response.status}`);
    const xml = await response.text();
    const posts = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
      .slice(0, 20)
      .map(([, block]) => ({
        title: plainText(tagValue(block, "title")),
        link: decodeXml(tagValue(block, "link")),
        pubDate: plainText(tagValue(block, "pubDate")),
        content: plainText(tagValue(block, "content:encoded") || tagValue(block, "description")),
      }))
      .filter((post) => post.title && /^https:\/\/blog\.naver\.com\//.test(post.link));

    return NextResponse.json({ posts, updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "블로그 피드를 불러오지 못했습니다." }, { status: 502 });
  }
}

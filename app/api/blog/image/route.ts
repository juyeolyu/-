import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "이미지 주소가 없습니다." }, { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "이미지 주소가 올바르지 않습니다." }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "postfiles.pstatic.net") {
    return NextResponse.json({ error: "허용되지 않은 이미지 주소입니다." }, { status: 400 });
  }
  // Naver's bare URL is only a 75×100 placeholder; use a smaller rendition for selectable thumbnails.
  const requestedQuality = request.nextUrl.searchParams.get("quality");
  const quality = requestedQuality === "240" || requestedQuality === "480" ? requestedQuality : "966";
  imageUrl.search = `?type=w${quality}`;

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 EUMLANTREE website",
        Referer: "https://blog.naver.com/",
      },
      signal: AbortSignal.timeout(12000),
    });
    const contentType = upstream.headers.get("content-type")?.split(";")[0] ?? "";
    if (!upstream.ok || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
      return new NextResponse(null, { status: 502 });
    }
    const image = await upstream.arrayBuffer();
    if (image.byteLength > 12 * 1024 * 1024) return new NextResponse(null, { status: 413 });
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

function extractText(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isValidUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    // Block internal/private IPs
    const host = u.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.") ||
      host === "[::1]" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });

  if (!isValidUrl(url)) {
    return NextResponse.json({ error: "유효하지 않은 URL입니다 (http/https만 허용)" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GovjobTracker/1.0)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : html;
    const rawText = stripHtml(body).slice(0, 5000);

    // 제목 추출 시도
    const title =
      extractText(html, /<title[^>]*>([^<]+)<\/title>/i) ||
      extractText(html, /<h1[^>]*>([^<]+)<\/h1>/i) ||
      null;

    return NextResponse.json({ title: title?.trim() ?? null, rawText });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `페이지를 가져올 수 없습니다: ${msg}` },
      { status: 422 }
    );
  }
}

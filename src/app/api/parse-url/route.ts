import { NextRequest, NextResponse } from "next/server";

function extractText(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL이 필요합니다" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GovjobTracker/1.0)" },
      signal: AbortSignal.timeout(10000),
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
    return NextResponse.json(
      { error: "페이지를 가져올 수 없습니다. 직접 입력해주세요." },
      { status: 422 }
    );
  }
}

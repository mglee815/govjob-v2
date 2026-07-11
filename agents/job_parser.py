#!/usr/bin/env python3
"""
job_parser.py — URL을 받아 Claude API로 채용 공고 정보를 추출하고 Supabase에 저장.

사용법:
  python job_parser.py <URL> [--dry-run]
  python job_parser.py --batch urls.txt [--dry-run]

환경변수 (.env 또는 셸):
  ANTHROPIC_API_KEY
  SUPABASE_URL
  SUPABASE_KEY
"""

import sys
import json
import argparse
import os
import re
import httpx
import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

EXTRACT_PROMPT = """당신은 한국 공공기관 채용 공고 정보를 추출하는 전문가입니다.
아래 텍스트에서 채용 공고의 핵심 정보를 추출하여 JSON으로만 반환하세요.
JSON 외 다른 텍스트는 절대 출력하지 마세요.

추출 규칙:
- 날짜는 YYYY-MM-DD 형식 (불명확하면 null)
- headcount는 정수 (불명확하면 null)
- 없는 정보는 null
- eligibility: 지원 자격 전체 (학력, 경력, 우대사항 포함)
- selection_method: 전형 단계 (서류→필기→면접 순서 포함)

반환 JSON 스키마:
{
  "title": "공고 제목",
  "organization": "기관명",
  "employment_type": "정규직|계약직|무기계약직|기간제 등",
  "work_location": "근무지",
  "eligibility": "지원자격 전체 텍스트",
  "selection_method": "선발방식 설명",
  "headcount": null,
  "salary": "급여/보수 정보",
  "application_start": null,
  "application_end": null,
  "written_exam_date": null,
  "interview_date": null,
  "announcement_date": null
}

채용 공고 텍스트:
---
{text}
---"""


def fetch_page(url: str) -> tuple[str, list[str]]:
    """URL에서 텍스트와 이미지 URL 목록을 반환."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    with httpx.Client(follow_redirects=True, timeout=15) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # 불필요한 태그 제거
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    # 연속 공백/줄바꿈 정리
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text[:8000]  # Claude 컨텍스트 절약

    # 이미지 URL 수집 (로고 제외)
    imgs = []
    for img in soup.find_all("img", src=True):
        src = img["src"]
        if not any(x in src.lower() for x in ["logo", "icon", "banner", "btn"]):
            if src.startswith("http"):
                imgs.append(src)
            elif src.startswith("/"):
                from urllib.parse import urlparse
                base = urlparse(url)
                imgs.append(f"{base.scheme}://{base.netloc}{src}")

    return text, imgs[:3]  # 이미지는 최대 3개


def extract_with_claude(text: str, image_urls: list[str] = None) -> dict:
    """Claude API로 채용 공고 정보 추출."""
    prompt = EXTRACT_PROMPT.format(text=text)

    messages = [{"role": "user", "content": []}]

    # 텍스트가 너무 짧고 이미지가 있으면 이미지도 전송
    if image_urls and len(text.strip()) < 500:
        for img_url in image_urls:
            try:
                with httpx.Client(timeout=10) as c:
                    img_resp = c.get(img_url)
                    if img_resp.status_code == 200:
                        import base64
                        ct = img_resp.headers.get("content-type", "image/jpeg")
                        b64 = base64.standard_b64encode(img_resp.content).decode()
                        messages[0]["content"].append({
                            "type": "image",
                            "source": {"type": "base64", "media_type": ct, "data": b64}
                        })
            except Exception:
                pass

    messages[0]["content"].append({"type": "text", "text": prompt})

    resp = _anthropic.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=messages,
    )

    raw = resp.content[0].text.strip()
    # JSON 블록 추출
    m = re.search(r"\{[\s\S]+\}", raw)
    if not m:
        raise ValueError(f"JSON 파싱 실패:\n{raw}")
    return json.loads(m.group())


def insert_to_supabase(job: dict) -> dict:
    """Supabase REST API로 공고 삽입."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    with httpx.Client() as client:
        resp = client.post(
            f"{SUPABASE_URL}/rest/v1/jobs",
            headers=headers,
            json=job,
        )
    if not resp.is_success:
        raise RuntimeError(f"Supabase 오류 {resp.status_code}: {resp.text}")
    return resp.json()[0]


def parse_url(url: str, extra: dict = None, dry_run: bool = False) -> dict:
    """URL 하나를 파싱하여 Supabase에 저장하고 결과 반환."""
    print(f"\n[파싱] {url}")

    try:
        text, images = fetch_page(url)
        print(f"  텍스트 {len(text)}자, 이미지 {len(images)}개 추출")
    except Exception as e:
        print(f"  ❌ 페이지 가져오기 실패: {e}")
        return None

    try:
        data = extract_with_claude(text, images)
        print(f"  ✅ 추출 완료: {data.get('organization')} / {data.get('title')}")
    except Exception as e:
        print(f"  ❌ Claude 추출 실패: {e}")
        return None

    # 추가 필드 병합 (status, notes 등)
    job = {
        "url": url,
        "status": "bookmarked",
        **data,
        **(extra or {}),
    }

    if dry_run:
        print(f"  [dry-run] 저장 생략\n  데이터: {json.dumps(job, ensure_ascii=False, indent=2)}")
        return job

    try:
        result = insert_to_supabase(job)
        print(f"  💾 저장 완료 (id={result.get('id')})")
        return result
    except Exception as e:
        print(f"  ❌ 저장 실패: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="채용 공고 URL 파서")
    parser.add_argument("url", nargs="?", help="파싱할 URL")
    parser.add_argument("--batch", metavar="FILE", help="URL 목록 파일 (한 줄에 하나)")
    parser.add_argument("--dry-run", action="store_true", help="저장 없이 추출만")
    parser.add_argument("--status", default="bookmarked", help="초기 지원 상태")
    parser.add_argument("--notes", default="", help="메모")
    args = parser.parse_args()

    extra = {}
    if args.status:
        extra["status"] = args.status
    if args.notes:
        extra["notes"] = args.notes

    if args.batch:
        urls = [l.strip() for l in open(args.batch) if l.strip() and not l.startswith("#")]
        print(f"배치 모드: {len(urls)}개 URL")
        results = [parse_url(u, extra=extra, dry_run=args.dry_run) for u in urls]
        ok = sum(1 for r in results if r)
        print(f"\n완료: {ok}/{len(urls)} 성공")
    elif args.url:
        parse_url(args.url, extra=extra, dry_run=args.dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

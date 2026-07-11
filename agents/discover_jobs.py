#!/usr/bin/env python3
"""
discover_jobs.py — 커뮤니티/게시판 페이지에서 채용 공고 URL을 수집하여
Supabase의 pending_urls 테이블에 저장합니다.

사용법:
  python discover_jobs.py --sources sources.txt
  python discover_jobs.py --sources sources.txt --dry-run

sources.txt 형식 (한 줄에 하나, # 주석 가능):
  # 나라일터
  https://www.work.go.kr/empInfo/empInfoSrch/list.do?careerTo=&minPay=&...
  # 공공기관 채용정보 카페
  https://cafe.naver.com/...
"""

import argparse
import os
import re
import json
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

# 채용 공고 URL 패턴 (공공기관 주요 채용 사이트)
JOB_URL_PATTERNS = [
    r"work\.go\.kr/empInfo/empInfoSrch/detail",
    r"saramin\.co\.kr/.*job-category",
    r"jobkorea\.co\.kr/recruit",
    r"incruit\.com/.*recruit",
    r"recruiter\.co\.kr",
    r"jobnlab\.co\.kr",
    r"/recruit/",
    r"/job/",
    r"/jobs/",
    r"/career/",
    r"/채용/",
    r"/고용/",
]


def is_job_url(url: str) -> bool:
    return any(re.search(p, url, re.I) for p in JOB_URL_PATTERNS)


def fetch_links(source_url: str) -> list[str]:
    """페이지에서 채용 공고로 보이는 링크들을 추출."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(source_url, headers=headers)
            resp.raise_for_status()
    except Exception as e:
        print(f"  ❌ 접근 실패: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    from urllib.parse import urljoin, urlparse

    base = urlparse(source_url)
    base_url = f"{base.scheme}://{base.netloc}"

    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("javascript"):
            continue
        full = urljoin(base_url, href)
        if is_job_url(full):
            links.add(full)

    return list(links)


def get_existing_urls() -> set[str]:
    """Supabase에서 이미 있는 URL 목록 조회 (jobs + pending_urls)."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    existing = set()
    with httpx.Client() as client:
        # 기존 jobs 테이블
        resp = client.get(
            f"{SUPABASE_URL}/rest/v1/jobs?select=url",
            headers=headers,
        )
        if resp.is_success:
            for row in resp.json():
                if row.get("url"):
                    existing.add(row["url"])

        # pending_urls 테이블 (없으면 무시)
        resp2 = client.get(
            f"{SUPABASE_URL}/rest/v1/pending_urls?select=url",
            headers=headers,
        )
        if resp2.is_success:
            for row in resp2.json():
                if row.get("url"):
                    existing.add(row["url"])

    return existing


def save_pending_urls(urls: list[str], source: str) -> int:
    """새 URL들을 pending_urls 테이블에 저장."""
    if not urls:
        return 0

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    rows = [
        {"url": u, "source": source, "discovered_at": datetime.now().isoformat()}
        for u in urls
    ]
    with httpx.Client() as client:
        resp = client.post(
            f"{SUPABASE_URL}/rest/v1/pending_urls",
            headers=headers,
            json=rows,
        )
    if not resp.is_success:
        print(f"  ⚠️ pending_urls 저장 실패: {resp.status_code} {resp.text[:200]}")
        return 0
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description="채용 공고 URL 수집기")
    parser.add_argument("--sources", required=True, help="소스 URL 목록 파일")
    parser.add_argument("--dry-run", action="store_true", help="저장 없이 출력만")
    args = parser.parse_args()

    sources = [
        l.strip() for l in open(args.sources)
        if l.strip() and not l.strip().startswith("#")
    ]
    print(f"소스 {len(sources)}개 처리 시작")

    existing = get_existing_urls()
    print(f"기존 URL {len(existing)}개 확인")

    total_new = 0
    for src in sources:
        print(f"\n[수집] {src}")
        links = fetch_links(src)
        new_links = [l for l in links if l not in existing]
        print(f"  발견 {len(links)}개 / 신규 {len(new_links)}개")

        if not new_links:
            continue

        for l in new_links:
            print(f"  + {l}")

        if args.dry_run:
            print("  [dry-run] 저장 생략")
            continue

        saved = save_pending_urls(new_links, src)
        total_new += saved
        existing.update(new_links)

    print(f"\n✅ 완료: 신규 URL {total_new}개 수집")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
migrate_v1.py — v1 jobs.json 데이터를 v2 Supabase DB로 마이그레이션.

사용법:
  python migrate_v1.py [--dry-run] [--limit N]
"""

import json
import sys
import argparse
import os
import re
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
V1_DATA = os.path.join(os.path.dirname(__file__), "v1_jobs.json")

STATUS_MAP = {
    "접수중": "applied",
    "서류제출": "applied",
    "서류불합격": "failed",
    "필기불합격": "failed",
    "패스(미지원)": "withdrawn",
    "마감(미지원)": "withdrawn",
    "마감": "bookmarked",
    "마감(오늘)": "bookmarked",
    "모니터링중": "bookmarked",
    "확인필요": "bookmarked",
    "다음공고대기": "bookmarked",
    "최종합격": "final_pass",
    "최종불합격": "failed",
}


def map_status(v1: dict) -> str:
    s = v1.get("status", "")
    # doc/written/final 필드 기반으로 더 정확한 상태 판별
    doc = v1.get("doc", "-")
    written = v1.get("written", "-")

    if s in ("접수중", "서류제출"):
        if written == "합격":
            return "written_pass"
        if doc == "합격":
            return "doc_pass"
        return "applied"

    return STATUS_MAP.get(s, "bookmarked")


def parse_headcount(s: str):
    if not s:
        return None
    m = re.search(r"\d+", str(s))
    return int(m.group()) if m else None


def build_eligibility(v1: dict):
    parts = []
    if v1.get("ncs"):
        parts.append(f"NCS: {v1['ncs']}")
    if v1.get("notice"):
        parts.append(v1["notice"])
    return "\n".join(parts) if parts else None


def build_selection_method(v1: dict):
    parts = []
    if v1.get("docEvalType"):
        part = f"서류전형: {v1['docEvalType']}"
        if v1.get("docEvalRatio"):
            part += f" ({v1['docEvalRatio']})"
        parts.append(part)
    return "\n".join(parts) if parts else None


def build_notes(v1: dict):
    parts = []
    if v1.get("fitReason"):
        parts.append(f"[적합도 이유] {v1['fitReason']}")
    if v1.get("memo"):
        parts.append(v1["memo"])
    if v1.get("failReason"):
        parts.append(f"[불합격 사유] {v1['failReason']}")
    return "\n\n".join(parts) if parts else None


def to_date(s: str):
    if not s or not re.match(r"\d{4}-\d{2}-\d{2}", s):
        return None
    return s[:10]


def v1_to_v2(v1: dict) -> dict:
    return {
        "title": f"{v1.get('org', '')} {v1.get('duty', '')}".strip() or "제목 없음",
        "organization": v1.get("org") or None,
        "url": v1.get("url") or None,
        "employment_type": v1.get("type") or None,
        "work_location": v1.get("region") or None,
        "eligibility": build_eligibility(v1),
        "selection_method": build_selection_method(v1),
        "headcount": parse_headcount(v1.get("headcount", "")),
        "salary": v1.get("salary") or None,
        "application_start": to_date(v1.get("docStart", "")),
        "application_end": to_date(v1.get("deadlineDoc", "")),
        "written_exam_date": to_date(v1.get("deadlineWritten", "")),
        "interview_date": to_date(v1.get("deadlineInterview", "")),
        "announcement_date": to_date(v1.get("deadlineAnnounce", "")),
        "notes": build_notes(v1),
        "status": map_status(v1),
    }


def insert_batch(jobs: list[dict]) -> list[dict]:
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
            json=jobs,
        )
    if not resp.is_success:
        raise RuntimeError(f"Supabase 오류 {resp.status_code}: {resp.text}")
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="v1 → v2 마이그레이션")
    parser.add_argument("--dry-run", action="store_true", help="저장 없이 변환 결과만 출력")
    parser.add_argument("--limit", type=int, default=None, help="처리할 최대 공고 수")
    args = parser.parse_args()

    with open(V1_DATA, encoding="utf-8") as f:
        v1_data = json.load(f)

    if args.limit:
        v1_data = v1_data[: args.limit]

    print(f"v1 공고 {len(v1_data)}개 → v2 변환 중...")
    converted = [v1_to_v2(j) for j in v1_data]

    # 상태 분포 출력
    from collections import Counter
    status_dist = Counter(j["status"] for j in converted)
    print("상태 분포:", dict(status_dist))

    if args.dry_run:
        print("\n[dry-run] 첫 3개 미리보기:")
        for j in converted[:3]:
            print(json.dumps(j, ensure_ascii=False, indent=2))
        return

    print(f"\nSupabase에 {len(converted)}개 삽입 중...")
    # 10개씩 배치 처리
    inserted = 0
    for i in range(0, len(converted), 10):
        batch = converted[i : i + 10]
        results = insert_batch(batch)
        inserted += len(results)
        print(f"  {inserted}/{len(converted)} 완료")

    print(f"\n✅ 마이그레이션 완료: {inserted}개 삽입")


if __name__ == "__main__":
    main()

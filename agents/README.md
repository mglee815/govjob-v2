# govjob-v2 Agents

공공기관 채용 공고를 수집·분석하는 에이전트 모음.

## 구조

```
agents/
├── job_parser.py      # URL → Claude 추출 → Supabase 저장
├── migrate_v1.py      # v1 jobs.json → Supabase 일회성 마이그레이션
├── requirements.txt
├── .env.example       # 환경변수 템플릿
└── v1_jobs.json       # v1 원본 데이터 (참조용)
```

## 설정

```bash
pip install -r requirements.txt
cp .env.example .env
# .env에 키 입력
```

**.env 항목:**
| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 (console.anthropic.com) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_KEY` | Supabase publishable key |

## job_parser.py — URL 파서

URL 하나를 받아 Claude가 정보를 추출하고 Supabase에 저장.

```bash
# 단일 URL
python job_parser.py https://example.com/recruit/notice/123

# 여러 URL (파일로)
python job_parser.py --batch urls.txt

# 저장 없이 추출만 확인
python job_parser.py https://... --dry-run

# 상태·메모 지정
python job_parser.py https://... --status planning --notes "NCS 준비 필요"
```

### 지원 형태
- **텍스트/HTML**: 페이지 텍스트 추출 후 Claude 분석
- **이미지 혼합**: 텍스트 부족 시 이미지를 Claude Vision으로 분석
- **다국어**: Claude가 자동 처리

### 추출 필드
제목, 기관명, 고용형태, 근무지, 지원자격, 선발방식, 선발인원, 급여, 접수기간, 시험일정

## Phase 2 (예정): job_discoverer.py

카페/커뮤니티 URL을 모니터링하여 새 공고를 자동 발견하는 에이전트.
GitHub Actions 스케줄로 매일 아침 실행 예정.

## migrate_v1.py — v1 데이터 마이그레이션 (완료)

v1 `jobs.json` → Supabase 일회성 삽입 스크립트. 이미 실행 완료(63개).

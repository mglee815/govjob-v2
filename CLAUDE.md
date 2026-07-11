# 공공기관 채용 트래커 (govjob-v2)

> **이 파일을 읽는 AI 또는 작업자에게**: 이 문서 하나로 프로젝트 전체 맥락을 파악할 수 있습니다.
> 새 환경에서 시작할 때는 "빠른 시작" 섹션부터 따라하세요.

## 프로젝트 목적

공공기관 채용 공고를 한 곳에서 수집·관리하는 개인용 트래커.
- 공고 URL을 입력하면 Claude가 주요 정보를 자동 추출
- 지원 상태(관심→지원→합격/불합격)를 실시간으로 추적
- 어느 기기, 어느 계정에서 접속해도 동일한 데이터 (Supabase 중앙 DB)

---

## 빠른 시작 (새 환경 세팅)

```bash
git clone https://github.com/mglee815/govjob-v2.git
cd govjob-v2
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 에 Supabase 키 입력 (아래 "환경변수" 섹션 참고)

npm run dev   # http://localhost:3000
```

---

## 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 프론트엔드 | Next.js 16 (App Router) + TypeScript | `src/app/` |
| 스타일 | Tailwind CSS v4 | |
| 데이터베이스 | Supabase (PostgreSQL) | 클라우드, 무료 플랜 |
| 배포 | Vercel | GitHub push → 자동 배포 |
| AI 에이전트 | Python 스크립트 (`agents/`) | Claude API 또는 Claude Code 직접 활용 |

---

## 환경변수

### 웹앱 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://yjxjwnqirtihqnfhrprj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R
```

### Vercel (배포 환경)
Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에 위 두 값 동일하게 입력.
환경변수 변경 후 반드시 **Redeploy** 필요.

### Python 에이전트 (`agents/.env`)
```
ANTHROPIC_API_KEY=sk-ant-...   # console.anthropic.com 에서 발급 (job_parser.py 사용 시)
SUPABASE_URL=https://yjxjwnqirtihqnfhrprj.supabase.co
SUPABASE_KEY=sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R
```

---

## Supabase DB 스키마

테이블: `jobs`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 자동 생성 |
| title | TEXT | 공고 제목 |
| organization | TEXT | 기관명 |
| url | TEXT | 원문 URL |
| duty | TEXT | 직무 (일반직 6급, 행정직 등) |
| employment_type | TEXT | 정규직/계약직 등 |
| work_location | TEXT | 근무지 |
| eligibility | TEXT | 지원자격 |
| selection_method | TEXT | 선발방식 |
| headcount | INTEGER | 선발인원 |
| salary | TEXT | 급여 |
| application_start | DATE | 접수시작일 |
| application_end | DATE | 접수마감일 |
| written_exam_date | DATE | 필기시험일 |
| interview_date | DATE | 면접일 |
| announcement_date | DATE | 최종발표일 |
| notes | TEXT | 개인 메모 |
| status | TEXT | 아래 상태값 참고 |
| created_at | TIMESTAMPTZ | 자동 |
| updated_at | TIMESTAMPTZ | 자동 갱신 |

**상태값 (status)**
```
collected       수집
monitoring      모니터링
check_needed    확인필요
available       접수중
watching        다음공고대기
applied         서류제출
doc_pass        서류합격
doc_fail        서류불합격
written_wait    필기대기
written_pass    필기합격
written_fail    필기불합격
interview_wait  면접대기
interview_pass  면접합격
interview_fail  면접불합격
final_pass      최종합격
withdrawn       패스(미지원)
expired         마감(미지원)
```

DB 초기화가 필요하면 `supabase-schema.sql`을 Supabase SQL Editor에서 실행.

---

## 파일 구조

```
govjob-v2/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 대시보드 (KPI 카드, 공고 목록, 필터)
│   │   ├── layout.tsx            # 공통 레이아웃 + 네비게이션
│   │   ├── jobs/
│   │   │   ├── new/page.tsx      # 공고 추가 (URL 파싱 + 수동 입력)
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # 공고 상세 + 상태 변경
│   │   │       └── edit/page.tsx # 공고 수정
│   │   └── api/parse-url/        # URL 파싱 API (서버사이드)
│   ├── components/
│   │   ├── JobCard.tsx           # 공고 카드 (인라인 상태 드롭다운 포함)
│   │   ├── JobForm.tsx           # 공고 입력/수정 폼
│   │   ├── Navbar.tsx            # 상단 네비게이션
│   │   └── StatusBadge.tsx       # 상태 배지
│   └── lib/
│       ├── supabase.ts           # Supabase 클라이언트
│       └── types.ts              # TypeScript 타입 + 상태값 정의
├── agents/
│   ├── job_parser.py             # URL → Claude 추출 → Supabase 저장
│   ├── discover_jobs.py          # 커뮤니티 페이지에서 신규 공고 URL 수집
│   ├── migrate_v1.py             # v1 데이터 마이그레이션 (완료, 재실행 불필요)
│   ├── v1_jobs.json              # v1 원본 데이터 (참조용)
│   ├── sources.example.txt       # 수집 소스 예시 → sources.txt로 복사해서 사용
│   └── requirements.txt          # Python 패키지
├── .claude/
│   ├── commands/
│   │   └── add-job.md            # /add-job 슬래시 커맨드 (URL 파싱 + AI 적합도 평가)
│   └── profile/
│       └── user.md               # 직무적합도 평가 프로필 (경력·자격·선호 지역·회피 산업 등)
├── .github/workflows/
│   └── daily-discover.yml        # 매일 09:00 KST 자동 URL 수집
├── supabase-schema.sql           # DB 초기화 SQL
└── CLAUDE.md                     # 이 파일
```

---

## 주요 기능 사용법

### 1. 공고 즉시 추가 (Claude Code 슬래시 커맨드)
```
/add-job https://채용공고URL
```
Claude Code가 URL 내용을 읽고 → 정보 추출 → `.claude/profile/user.md` 기반 **AI 적합도 평가** → Supabase에 저장.
별도 API 키 불필요. `govjob-v2` 폴더에서 Claude Code 실행 중일 때 사용 가능.

**적합도 평가 프로필 수정**: `.claude/profile/user.md` 파일을 편집하면 다음 `/add-job` 실행부터 새 기준이 자동 적용됩니다.

### 2. 웹 UI에서 공고 추가
대시보드 우상단 **"+ 공고 추가"** → URL 입력 → "가져오기" → 정보 확인 후 저장.

### 3. 상태 변경
- **대시보드**: 각 공고 카드 하단 드롭다운으로 즉시 변경 (DB 자동 저장)
- **상세 페이지**: 버튼으로 단계별 변경

### 4. Python 에이전트로 배치 추가
```bash
cd agents
pip install -r requirements.txt
cp .env.example .env  # 키 입력
python job_parser.py https://...          # 단일 URL
python job_parser.py --batch urls.txt     # 다수 URL
```

---

## Git 워크플로우 (중앙 관리 규칙)

**모든 변경은 반드시 GitHub 중앙 레포를 통해야 합니다.**

```bash
# 새 환경에서 시작
git clone https://github.com/mglee815/govjob-v2.git

# 작업 후 반드시 push
git add .
git commit -m "작업 내용 요약"
git push origin main
```

**엄격한 규칙:**
- 로컬에만 커밋하고 push 안 하면 다른 사람이 볼 수 없음
- 작업 시작 전 반드시 `git pull origin main`으로 최신 상태 동기화
- `.env.local`, `agents/.env` 파일은 절대 push 금지 (비밀키 포함)

**Vercel 자동 배포:**
`main` 브랜치에 push → Vercel이 자동으로 재빌드 → https://govjob-v2.vercel.app 반영.

---

## GitHub Secrets (Actions 자동화용)

레포 → Settings → Secrets → Actions에 등록:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ANTHROPIC_API_KEY` (job_parser 자동화 시)

---

## 배포 현황

| 서비스 | URL | 비고 |
|--------|-----|------|
| 웹앱 | https://govjob-v2.vercel.app | Vercel 무료 플랜 |
| DB | https://supabase.com/dashboard/project/yjxjwnqirtihqnfhrprj | Supabase 무료 플랜 |
| 소스코드 | https://github.com/mglee815/govjob-v2 | Public |

---

## 앞으로 할 일 (Phase 2)

- [ ] `agents/discover_jobs.py`: 커뮤니티/게시판에서 신규 공고 URL 자동 수집
- [ ] `agents/sources.txt` 작성: 모니터링할 사이트 URL 목록 추가
- [ ] GitHub Secrets 등록: Actions 자동화 활성화
- [ ] `pending_urls` Supabase 테이블 생성 (발견된 URL 임시 보관)
- [ ] job_parser.py를 GitHub Actions에 연동: 수집 → 자동 파싱 → DB 저장

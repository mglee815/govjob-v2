# 공공기관 채용 트래커 (govjob-v2)

> **이 파일을 읽는 Claude에게**: 이 프로젝트는 **여러 협업자(사용자·여러 기기·여러 세션)** 가 같은 GitHub 레포를 공유하며 작업합니다. 아래 "협업 프로토콜"을 **반드시 지켜야** v1에서 있었던 데이터 덮어쓰기 사고를 재발하지 않습니다.

---

## 🚨 협업 프로토콜 (수정 시점 단위)

이 프로젝트는 세션이 오래 열려 있어도 안전해야 합니다 (예: 세션을 안 닫고 퇴근한 뒤 다른 기기에서 수정). 따라서 **세션 시작·종료가 아니라 "수정 직전·직후"** 단위로 원격과 동기화합니다.

### Rule 1. 파일 수정 전 → 자동 pull 체크 (훅으로 강제)
`.claude/hooks/check-pull.sh` 훅이 **Edit / Write / NotebookEdit / MultiEdit 도구 실행 직전마다** 자동 실행됩니다. 원격이 앞서 있으면 도구 사용이 차단됩니다 (`exit 2`). 이 경우 Claude는:

1. 훅이 안내한 대로 `git pull origin main` 실행
2. pull 성공 후 원래 수정 작업 재시도
3. 사용자에게 "원격 변경사항 N개 반영 후 작업 계속"이라고 짧게 보고

훅이 통과됐다는 건 로컬이 원격과 동기화됐거나(로컬만 앞선 상태 포함) 오프라인이라 확인 불가한 상태를 의미합니다.

### Rule 2. 파일 수정 후 → 즉시 commit + push
훅은 push까지 자동으로 해주지 않습니다. Claude가 다음을 수행해야 합니다:

- **작업 단위(feature/fix/문서 등)를 끝낼 때마다** 반드시 `git add → git commit → git push origin main`
- 로컬에만 커밋하고 응답을 끝내지 말 것. 사용자가 명시적으로 "커밋만 하고 push는 나중에"라고 하지 않는 한 push까지 진행
- 배포는 push 즉시 Vercel이 자동 처리 → 별도 작업 불필요

### Rule 3. Supabase 데이터 조작은 git과 무관
`/add-job` 등 Supabase DB 직접 조작은 pull/push와 관계없이 실시간 반영됩니다. 훅도 트리거되지 않습니다 (파일 수정이 아니므로).

### Rule 4. 훅 우회 금지
- Bash 도구로 `sed -i`, `echo >`, `cat > file` 등을 써서 파일을 수정하면 훅이 트리거되지 않습니다. 이건 사고를 유발할 수 있으니 **파일 수정은 반드시 Edit/Write 도구를 사용**하세요.
- 훅을 비활성화하려면 사용자가 명시적으로 요청한 경우에만 응답 (예: "훅 잠깐 꺼줘")

---

## 프로젝트 목적

한규리(사용자)의 공공기관 채용 지원을 관리하는 개인용 트래커. 여러 기기·세션에서 동일한 데이터에 접근하고, Claude Code 스킬을 통해 공고 추가·평가·관리를 자동화합니다.

- 공고 URL 입력 → Claude가 정보 추출 + 프로필 기반 **AI 적합도 평가** → Supabase 저장
- 지원 상태(수집→접수중→서류→필기→면접→최종) 실시간 추적
- 모든 데이터는 Supabase 중앙 DB에 저장 → 어느 기기에서 접속해도 동일

---

## 빠른 시작 (레포 클론 후 첫 세팅)

```bash
git clone https://github.com/mglee815/govjob-v2.git
cd govjob-v2
npm install

cp .env.local.example .env.local
# .env.local 값은 아래 "환경변수" 섹션 참고

npm run dev   # http://localhost:3000
```

Claude Code로 이 폴더를 열면 CLAUDE.md·스킬·프로필이 자동 로드됩니다.

---

## Claude Code에서 이 프로젝트로 무엇을 할 수 있나

| 목적 | 방법 |
|------|------|
| 새 공고 추가 | `/add-job https://URL` — 프로필 기반 적합도 자동 평가 후 DB 저장 |
| 코드 수정 | 그냥 요청하세요 (예: "그리드에 급여 컬럼 추가해줘") — 훅이 자동으로 pull 체크 후 진행, 완료 시 Claude가 push |
| 상태 변경 | 웹 대시보드에서 드롭다운으로 즉시 변경 (Supabase 자동 저장) |
| 프로필 갱신 | `.claude/profile/user.md` 편집 → 커밋 → push (다음 `/add-job` 부터 새 기준 자동 적용) |

---

## 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| 프론트엔드 | Next.js 16 (App Router) + TypeScript | `src/app/` |
| 스타일 | Tailwind CSS v4 | |
| 데이터베이스 | Supabase (PostgreSQL) | 무료 플랜, 프로젝트 `yjxjwnqirtihqnfhrprj` |
| 배포 | Vercel | GitHub push → 자동 배포 |
| Claude Code | 스킬(`.claude/commands/`) + 프로필(`.claude/profile/`) | 이 폴더에서 열면 자동 로드 |

---

## 환경변수

### 웹앱 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://yjxjwnqirtihqnfhrprj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R
```

### Vercel (배포 환경)
Vercel 대시보드 → Settings → Environment Variables에 위 두 값 등록. 변경 후 반드시 **Redeploy**.

### Python 에이전트 (`agents/.env`, 선택)
```
ANTHROPIC_API_KEY=sk-ant-...   # console.anthropic.com (job_parser.py 사용 시)
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
| application_start | DATE | 접수 시작일 |
| application_end | DATE | 접수 마감일 |
| doc_announcement_date | DATE | 서류 발표일 |
| written_exam_date | DATE | 필기시험일 |
| interview_date | DATE | 면접일 1차 |
| interview_date_2 | DATE | 면접일 2차 |
| announcement_date | DATE | 최종발표일 |
| fit | INTEGER | 직무 적합도 (0=미평가, 1~5 별점) |
| fit_reason | TEXT | 적합도 판단 근거 |
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
│   │   ├── page.tsx              # 대시보드 (KPI 카드, 그리드, 필터)
│   │   ├── layout.tsx            # 공통 레이아웃 + 네비게이션
│   │   ├── jobs/
│   │   │   ├── new/page.tsx      # 공고 추가 (URL 파싱 + 수동 입력)
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # 공고 상세 + 상태 변경
│   │   │       └── edit/page.tsx # 공고 수정
│   │   └── api/parse-url/        # URL 파싱 API
│   ├── components/
│   │   ├── JobTable.tsx          # 그리드 뷰 (적합도 별점, 보더 색상, 행 배경)
│   │   ├── JobForm.tsx           # 공고 입력/수정 폼
│   │   ├── Navbar.tsx            # 상단 네비게이션
│   │   └── StatusBadge.tsx       # 상태 배지
│   └── lib/
│       ├── supabase.ts           # Supabase 클라이언트
│       └── types.ts              # TypeScript 타입 + 상태값 정의
├── agents/
│   ├── job_parser.py             # URL → Claude 추출 → Supabase 저장 (Python)
│   ├── discover_jobs.py          # 신규 공고 URL 자동 수집 (Phase 2)
│   ├── migrate_v1.py             # v1 데이터 마이그레이션 (완료)
│   └── requirements.txt
├── .claude/
│   ├── commands/
│   │   └── add-job.md            # /add-job — URL 파싱 + AI 적합도 평가 + DB 저장
│   ├── profile/
│   │   └── user.md               # 한규리 직무적합도 평가 프로필
│   ├── hooks/
│   │   └── check-pull.sh         # Edit/Write 실행 전 자동 pull 체크
│   └── settings.json             # 훅 등록
├── .github/workflows/
│   └── daily-discover.yml        # 매일 09:00 KST 자동 URL 수집 (Phase 2)
├── supabase-schema.sql           # DB 초기화 SQL
├── CLAUDE.md                     # 이 파일
└── README.md                     # GitHub 랜딩 페이지
```

---

## 배포 현황

| 서비스 | URL |
|--------|-----|
| 웹앱 | https://govjob-v2.vercel.app |
| DB | https://supabase.com/dashboard/project/yjxjwnqirtihqnfhrprj |
| 소스코드 | https://github.com/mglee815/govjob-v2 (Public) |

Vercel은 `main` 브랜치에 push되면 자동으로 재빌드·재배포.

---

## 앞으로 할 일 (Phase 2)

- [ ] `agents/discover_jobs.py`: 커뮤니티/게시판에서 신규 공고 URL 자동 수집
- [ ] `agents/sources.txt` 작성: 모니터링할 사이트 URL 목록
- [ ] GitHub Secrets 등록: Actions 자동화 활성화
- [ ] `pending_urls` Supabase 테이블 생성 (발견된 URL 임시 보관)
- [ ] job_parser.py를 GitHub Actions에 연동

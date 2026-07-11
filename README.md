# 공공기관 채용 트래커 (govjob-v2)

공공기관 채용 공고를 수집하고, AI 기반 직무 적합도를 자동 평가하며, 지원 상태를 실시간으로 추적하는 개인용 대시보드입니다.

**핵심 흐름:** 공고 URL 입력 -> Claude가 정보 추출 + 프로필 기반 적합도 평가 -> Supabase 저장 -> 대시보드에서 상태 관리

> **라이브 데모:** https://govjob-v2.vercel.app

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.2 |
| 언어 | TypeScript | 5.x |
| 스타일 | Tailwind CSS | v4 |
| 데이터베이스 | Supabase (PostgreSQL) | - |
| 배포 | Vercel | GitHub push 자동 배포 |
| AI 연동 | Claude Code (스킬 + 프로필) | - |

---

## 빠른 시작

### 사전 요구사항

- **Node.js** 20 이상 (Next.js 16 요구사항)
- **npm** 또는 호환 패키지 매니저
- **Git**

### 1. 클론 및 의존성 설치

```bash
git clone https://github.com/mglee815/govjob-v2.git
cd govjob-v2
npm install
```

### 2. 환경변수 설정

`.env.local.example`을 복사하여 `.env.local`을 만듭니다.

```bash
cp .env.local.example .env.local
```

자체 Supabase 프로젝트를 사용하려면 `.env.local`의 값을 수정하세요. 아래 [Supabase 설정](#supabase-설정) 섹션을 참고합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 대시보드가 표시됩니다.

### 4. 빌드 확인 (선택)

```bash
npm run build
npm start
```

---

## Claude Code 연동

이 프로젝트는 [Claude Code](https://claude.com/claude-code) CLI와 긴밀하게 통합되어 있습니다. 프로젝트 디렉토리에서 Claude Code를 열면 스킬, 프로필, 훅이 자동으로 로드됩니다.

### 시작하기

```bash
# Claude Code CLI 설치 (아직 없다면)
npm install -g @anthropic-ai/claude-code

# 프로젝트 디렉토리에서 실행
cd govjob-v2
claude
```

### 사용 가능한 스킬

| 스킬 | 설명 | 사용 예시 |
|------|------|-----------|
| `/add-job` | URL에서 공고 정보 자동 추출 + AI 적합도 평가 + DB 저장 | `/add-job https://www.alio.go.kr/...` |

`/add-job`은 다음 순서로 동작합니다:

1. 사용자 프로필(`.claude/profile/user.md`) 로드
2. URL에서 공고 정보 추출 (WebFetch -> Chrome -> 스크린샷 -> 수동 입력, 4단계 폴백)
3. 프로필 기반 적합도 평가 (1~5점)
4. 추출 결과를 사용자에게 확인
5. Supabase에 저장

### 프로필 커스터마이징

`.claude/profile/user.md` 파일에 자신의 경력, 자격, 선호 조건을 기술하면 `/add-job` 실행 시 이 정보를 기반으로 적합도를 자동 평가합니다.

프로필을 수정하면 다음 `/add-job` 실행부터 새 기준이 자동 적용됩니다. 별도의 스킬 수정은 필요 없습니다.

### 자동 Pull 체크 훅

`.claude/hooks/check-pull.sh`가 파일 수정 도구(Edit, Write 등) 실행 전에 자동으로 원격 저장소를 확인합니다.

- 원격에 새 커밋이 있으면 수정이 차단되고 `git pull` 안내가 표시됩니다
- 여러 기기/세션에서 동시 작업할 때 덮어쓰기 사고를 방지합니다
- 오프라인 환경에서는 10초 타임아웃 후 로컬 상태로 진행합니다

훅 설정은 `.claude/settings.json`에 등록되어 있으며, 클론하면 자동으로 활성화됩니다.

---

## Supabase 설정

자체 Supabase 인스턴스를 사용하려면:

### 1. 프로젝트 생성

[Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.

### 2. 스키마 초기화

Supabase 대시보드 > SQL Editor > New Query에서 `supabase-schema.sql` 파일의 내용을 붙여넣고 실행합니다.

```bash
# 스키마 파일 내용 확인
cat supabase-schema.sql
```

이 스키마는 `jobs` 테이블과 `updated_at` 자동 갱신 트리거를 생성합니다.

### 3. API 키 확인

Supabase 대시보드 > Settings > API에서 다음 값을 확인합니다:

- **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
- **anon/public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 4. 환경변수 업데이트

`.env.local` 파일을 수정합니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. RLS 설정 (선택)

필요에 따라 Row Level Security를 활성화할 수 있습니다. `supabase-schema.sql` 하단의 주석을 참고하세요.

---

## 배포

### Vercel 배포

이 프로젝트는 Vercel에 배포되어 있으며, `main` 브랜치에 push하면 자동으로 빌드 및 배포됩니다.

자체 Vercel 배포를 설정하려면:

1. [Vercel](https://vercel.com)에서 GitHub 레포를 Import
2. Environment Variables에 다음을 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

환경변수를 변경한 경우 Vercel 대시보드에서 Redeploy가 필요합니다.

---

## 프로젝트 구조

```
govjob-v2/
├── src/
│   ├── app/
│   │   ├── page.tsx                # 대시보드 (KPI 카드, 그리드, 필터)
│   │   ├── layout.tsx              # 공통 레이아웃 + 네비게이션
│   │   ├── jobs/
│   │   │   ├── new/page.tsx        # 공고 추가 (URL 파싱 + 수동 입력)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 공고 상세 + 상태 변경
│   │   │       └── edit/page.tsx   # 공고 수정
│   │   └── api/parse-url/          # URL 파싱 API
│   ├── components/
│   │   ├── JobTable.tsx            # 그리드 뷰 (적합도 별점, 보더 색상)
│   │   ├── JobForm.tsx             # 공고 입력/수정 폼
│   │   ├── Navbar.tsx              # 상단 네비게이션
│   │   └── StatusBadge.tsx         # 상태 배지
│   └── lib/
│       ├── supabase.ts             # Supabase 클라이언트
│       └── types.ts                # TypeScript 타입 + 상태값 정의
├── agents/
│   ├── job_parser.py               # URL -> Claude 추출 -> Supabase 저장 (Python)
│   ├── discover_jobs.py            # 신규 공고 URL 자동 수집 (Phase 2)
│   └── requirements.txt
├── .claude/
│   ├── commands/add-job.md         # /add-job 스킬 정의
│   ├── profile/user.md             # 사용자 직무적합도 평가 프로필
│   ├── hooks/check-pull.sh         # Edit/Write 전 자동 pull 체크
│   └── settings.json               # 훅 등록
├── supabase-schema.sql             # DB 초기화 SQL
├── CLAUDE.md                       # Claude Code 프로젝트 지시사항
└── README.md                       # 이 파일
```

---

## 데이터 모델

### jobs 테이블 주요 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `title` | TEXT | 공고 제목 |
| `organization` | TEXT | 기관명 |
| `url` | TEXT | 원문 URL |
| `duty` | TEXT | 직무 |
| `employment_type` | TEXT | 고용형태 |
| `fit` | INTEGER | 적합도 (0=미평가, 1~5) |
| `fit_reason` | TEXT | 적합도 판단 근거 |
| `status` | TEXT | 지원 상태 |
| `application_end` | DATE | 접수 마감일 |

### 상태값 (status)

| 값 | 의미 | | 값 | 의미 |
|---|---|---|---|---|
| `collected` | 수집 | | `applied` | 서류제출 |
| `monitoring` | 모니터링 | | `doc_pass` / `doc_fail` | 서류 합격/불합격 |
| `check_needed` | 확인필요 | | `written_pass` / `written_fail` | 필기 합격/불합격 |
| `available` | 접수중 | | `interview_pass` / `interview_fail` | 면접 합격/불합격 |
| `watching` | 다음공고대기 | | `final_pass` | 최종합격 |
| `withdrawn` | 패스(미지원) | | `expired` | 마감(미지원) |

전체 스키마는 `supabase-schema.sql`을 참고하세요.

---

## 협업 프로토콜

이 프로젝트는 여러 기기/세션에서 동시에 작업할 수 있도록 설계되었습니다.

1. **수정 전 자동 pull 체크**: Claude Code의 PreToolUse 훅이 파일 수정 전에 원격 변경사항을 확인합니다
2. **수정 후 즉시 commit + push**: 작업 단위가 끝나면 바로 push하여 다른 세션과 충돌을 방지합니다
3. **Supabase 데이터는 실시간**: DB 조작은 git과 무관하게 즉시 반영됩니다

자세한 내용은 `CLAUDE.md`의 협업 프로토콜 섹션을 참고하세요.

---

## 라이선스

개인 프로젝트입니다.

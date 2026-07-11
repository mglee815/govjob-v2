# 채용 공고 추가

주어진 URL에서 채용 공고 정보를 추출하고, 사용자 프로필 기반 AI 적합도까지 평가하여 Supabase DB에 저장합니다.

## 실행 절차

### 0. 프로필 로드
반드시 먼저 `.claude/profile/user.md` 파일을 Read로 읽어 사용자 프로필을 확인합니다. 이 파일이 적합도 평가의 기준입니다. 파일이 없으면 사용자에게 알리고 중단합니다.

### 1. URL 가져오기
`$ARGUMENTS`에서 URL을 추출합니다. URL이 없으면 사용자에게 요청합니다.

### 2. 페이지 내용 읽기
WebFetch 도구로 해당 URL의 내용을 가져옵니다. 접근이 안 되면 사용자에게 공고 텍스트를 직접 붙여넣도록 안내합니다.

### 3. 정보 추출
페이지 내용에서 아래 정보를 추출합니다. 없는 항목은 null로 처리합니다.

- `title`: 공고 제목
- `organization`: 기관명
- `duty`: 직무 (예: "일반직 6급 일반행정", "사무행정", "연구원(석사)" 등 구체적으로)
- `employment_type`: 고용형태 (정규직/계약직/무기계약직/기간제 등)
- `work_location`: 근무지 (지역명)
- `eligibility`: 지원자격 전체 (학력, 경력 인정범위, 우대사항 포함) — **경력 인정범위는 반드시 원문 문구 포함**
- `selection_method`: 선발 방식 및 단계 (서류→NCS 필기→면접, 서류·면접 비중 등)
- `headcount`: 선발인원 (숫자만, 없으면 null)
- `salary`: 급여/보수 정보
- `application_start`: 접수 시작일 (YYYY-MM-DD, 없으면 null)
- `application_end`: 접수 마감일 (YYYY-MM-DD, 없으면 null)
- `doc_announcement_date`: 서류합격 발표일 (YYYY-MM-DD, 없으면 null)
- `written_exam_date`: 필기시험일 (YYYY-MM-DD, 없으면 null)
- `interview_date`: 면접일 1차 (YYYY-MM-DD, 없으면 null)
- `interview_date_2`: 면접일 2차 (YYYY-MM-DD, 없으면 null)
- `announcement_date`: 최종발표일 (YYYY-MM-DD, 없으면 null)

### 4. AI 적합도 평가 (프로필 기반)

`.claude/profile/user.md`의 "7. 직무적합도 평가 시 가중치 제안" 섹션을 기준으로 아래 요소들을 대조 평가하여 `fit` (1~5점)과 `fit_reason`(한 줄, 100자 이내)을 산출합니다.

**평가 축 (프로필 §7 반영)**

1. **경력 인정범위** (최우선 가중치): 공고에 "리서치·정책연구·공공행정" 경력 인정이 명시되는가?
   - 명시적 인정 → 큰 가점
   - 모호/애매 → 감점 + fit_reason에 "인사팀 확인 필요" 플래그
   - 관광·서비스 등 미스매치 산업 → 감점 (프로필 §6 "회피" 참고)

2. **전형 구조**:
   - 서류·면접 비중 큰 전형 → 가점
   - NCS 필기 단독 관문 → 감점 (프로필 §6, NCS 반복 탈락 이력)

3. **지역**:
   - 서울·성남 → 가점
   - 성남시 거주 가산점(5% 등) 존재 → 추가 가점
   - 수도권 → 소폭 가점
   - 세종·충청권 → 조건부 (현 재직지 기반)
   - 그 외 지방 이전 필요 → 감점

4. **직무 매칭**:
   - 데이터분석·통계·정책연구·조사·텍스트분석 키워드 → 가점
   - 토목·회계·시설관리 전담 → 감점

5. **자격 요건 자동 대조**:
   - ADsP, 석사, 리서치 3년 4개월 + 정책연구 1~2년 경력으로 요건 충족 여부 판단
   - 만 34세 이하 청년 제한경쟁 응시 가능
   - TOEIC 865(만료 임박), HSK 6급(만료 임박) 확인

**점수 산정 예시**
| 점수 | 조건 |
|------|------|
| **5점** | 서울/성남 정규직 + 리서치/정책연구 경력 명시적 인정 + 서류·면접 중심 + 데이터/정책 직무 |
| **4점** | 대부분 부합 (예: 수도권 정규직 + 자격 충족, 성남 가산점 등) |
| **3점** | 부분 부합 or 경력 인정범위 확인 필요 (모호한 경우) |
| **2점** | NCS 필기 단독 or 지방 이전 + 관련성 낮음 |
| **1점** | 회피 산업(관광·서비스) or 자격 미달 |

**fit_reason 작성 규칙**
- 100자 이내 한 줄
- 결정적 요인을 앞에 배치 (경력 인정범위 여부, 지역, 직무 매칭 순)
- 감점 요인이 있으면 명시 (예: "NCS 단독", "인사팀 확인 필요")
- 예: "성남 정규직·리서치 경력 명시적 인정·서류/면접 중심" (5점)
- 예: "서울 정규직·데이터 직무 매칭이나 NCS 필기 단독" (3점)
- 예: "지방 이전 + 관광·서비스 미스매치" (1점)

### 5. 추출 결과 확인
추출한 정보 + 적합도 평가를 사용자에게 표로 보여주고 수정이 필요하면 반영합니다.

### 6. Supabase 저장
아래 형식으로 Supabase REST API에 POST 요청을 보냅니다.

```bash
curl -s -X POST "https://yjxjwnqirtihqnfhrprj.supabase.co/rest/v1/jobs" \
  -H "apikey: sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Authorization: Bearer sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '<JSON 데이터>'
```

JSON 데이터에는 반드시 `fit`, `fit_reason`, `url`도 포함합니다.

### 7. 완료 보고
저장된 공고의 제목, 기관명, 마감일, 적합도(★★★★☆ 4점), fit_reason을 알려줍니다. 대시보드 URL: https://govjob-v2.vercel.app

## 상태값 기준
- 기본값: `collected` (수집)
- 사용자가 명시하면 변경:
  - `monitoring` (모니터링)
  - `check_needed` (확인필요)
  - `available` (접수중)
  - `applied` (서류제출)
  - 기타 17개 상태값 참고: `src/lib/types.ts`

## 예시 호출
```
/add-job https://www.work.go.kr/empInfo/empInfoSrch/detail/...
/add-job https://recruit.kakao.com/... --status monitoring
```

## 참고
- 프로필: `.claude/profile/user.md` — 검증된 경력/역량만 사용, 미검증 수치·에피소드는 프로필 §8 "리스크 및 금지사항" 참고
- 이 커맨드는 프로필이 갱신될 때 자동으로 최신 기준을 반영합니다 (별도 커맨드 수정 불필요)

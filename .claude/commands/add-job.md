# 채용 공고 추가

주어진 URL에서 채용 공고 정보를 추출하고 AI 적합도까지 평가하여 Supabase DB에 저장합니다.

## 실행 절차

1. **URL 가져오기**: `$ARGUMENTS`에서 URL을 추출합니다. URL이 없으면 사용자에게 요청합니다.

2. **페이지 내용 읽기**: WebFetch 도구로 해당 URL의 내용을 가져옵니다. 접근이 안 되면 사용자에게 공고 텍스트를 직접 붙여넣도록 안내합니다.

3. **정보 추출**: 페이지 내용에서 아래 정보를 추출합니다. 없는 항목은 null로 처리합니다.
   - `title`: 공고 제목
   - `organization`: 기관명
   - `duty`: 직무 (예: "일반직 6급 일반행정", "사무행정", "연구원(석사)" 등 구체적으로)
   - `employment_type`: 고용형태 (정규직/계약직/무기계약직/기간제 등)
   - `work_location`: 근무지 (지역명)
   - `eligibility`: 지원자격 전체 (학력, 경력, 우대사항 포함)
   - `selection_method`: 선발 방식 및 단계 (서류→필기→면접 등)
   - `headcount`: 선발인원 (숫자만, 없으면 null)
   - `salary`: 급여/보수 정보
   - `application_start`: 접수 시작일 (YYYY-MM-DD, 없으면 null)
   - `application_end`: 접수 마감일 (YYYY-MM-DD, 없으면 null)
   - `doc_announcement_date`: 서류합격 발표일 (YYYY-MM-DD, 없으면 null)
   - `written_exam_date`: 필기시험일 (YYYY-MM-DD, 없으면 null)
   - `interview_date`: 면접일 1차 (YYYY-MM-DD, 없으면 null)
   - `interview_date_2`: 면접일 2차 (YYYY-MM-DD, 없으면 null)
   - `announcement_date`: 최종발표일 (YYYY-MM-DD, 없으면 null)

4. **AI 적합도 평가**: 추출한 정보를 기반으로 아래 기준에 따라 `fit` (1~5점) 과 `fit_reason` (한 줄 요약) 을 산출합니다.

### 사용자 프로필 (평가 기준)
- **학위**: 석사 (소셜데이터사이언스 계열)
- **선호 직무**: 데이터분석 · 일반행정 · 사무행정 · 연구직(신입/석사)
- **선호 지역**: 서울/경인권(1순위) > 수도권 > 광역시 > 지방
- **선호 고용형태**: 정규직 > 무기계약직 > 채용형 인턴 > 기간제
- **선호 특성**: 학력·경력 제한 없거나 석사 우대 명시, 블라인드 채용

### 점수 산정 규칙
| 점수 | 조건 (다수 부합 시) |
|------|---------------------|
| **5점** | 서울/경인권 + 정규직 + 데이터·행정 직무 + 석사 우대 명시 (또는 자격 제한 없음) |
| **4점** | 위 조건 대부분 부합 (예: 수도권 정규직 + 자격 충족, 또는 지방이지만 완벽 매칭) |
| **3점** | 부분 부합 또는 원문 확인 필요 (예: 특수 기관, 애매한 직무 매칭) |
| **2점** | 낮은 부합 (지방 + 관련성 낮은 직무, 또는 지원 자격 미달 가능성) |
| **1점** | 거의 부적합 (지역·직무·자격 모두 미매칭) |

`fit_reason`은 한 줄(100자 이내)로 왜 그 점수인지 구체적으로 작성합니다.
예: "서울 정규직·일반행정·석사 우대·블라인드 채용" (5점)
예: "6급 신입은 자격제한 없음(석사 강점), 경기 평택 정규직" (4점)
예: "서울 포함이나 어촌·항만 특수 기관, 직무 적합성 원문 확인 필요" (3점)

5. **추출 결과 확인**: 추출한 정보 + 적합도 평가를 사용자에게 표로 보여주고 수정이 필요하면 반영합니다.

6. **Supabase 저장**: 아래 형식으로 Supabase REST API에 POST 요청을 보냅니다.

```bash
curl -s -X POST "https://yjxjwnqirtihqnfhrprj.supabase.co/rest/v1/jobs" \
  -H "apikey: sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Authorization: Bearer sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '<JSON 데이터>'
```

JSON 데이터에는 반드시 `fit`, `fit_reason`, `url` 도 포함합니다.

7. **완료 보고**: 저장된 공고의 제목, 기관명, 마감일, 적합도(★★★★☆ 4점)를 알려줍니다. 대시보드 URL: https://govjob-v2.vercel.app

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

# 채용 공고 추가

주어진 URL에서 채용 공고 정보를 추출하여 Supabase DB에 저장합니다.

## 실행 절차

1. **URL 가져오기**: `$ARGUMENTS`에서 URL을 추출합니다. URL이 없으면 사용자에게 요청합니다.

2. **페이지 내용 읽기**: WebFetch 도구로 해당 URL의 내용을 가져옵니다. 접근이 안 되면 사용자에게 공고 텍스트를 직접 붙여넣도록 안내합니다.

3. **정보 추출**: 페이지 내용에서 아래 정보를 추출합니다. 없는 항목은 null로 처리합니다.
   - `title`: 공고 제목
   - `organization`: 기관명
   - `employment_type`: 고용형태 (정규직/계약직/무기계약직/기간제 등)
   - `work_location`: 근무지
   - `eligibility`: 지원자격 전체 (학력, 경력, 우대사항 포함)
   - `selection_method`: 선발 방식 및 단계 (서류→필기→면접 등)
   - `headcount`: 선발인원 (숫자만, 없으면 null)
   - `salary`: 급여/보수 정보
   - `application_start`: 접수 시작일 (YYYY-MM-DD, 없으면 null)
   - `application_end`: 접수 마감일 (YYYY-MM-DD, 없으면 null)
   - `written_exam_date`: 필기시험일 (YYYY-MM-DD, 없으면 null)
   - `interview_date`: 면접일 (YYYY-MM-DD, 없으면 null)
   - `announcement_date`: 최종발표일 (YYYY-MM-DD, 없으면 null)

4. **추출 결과 확인**: 추출한 정보를 사용자에게 표로 보여주고 수정이 필요하면 반영합니다.

5. **Supabase 저장**: 아래 형식으로 Supabase REST API에 POST 요청을 보냅니다.

```bash
curl -s -X POST "https://yjxjwnqirtihqnfhrprj.supabase.co/rest/v1/jobs" \
  -H "apikey: sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Authorization: Bearer sb_publishable_kgQoE7waNJuWL8ztAxni-w_Vqy9w63R" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '<JSON 데이터>'
```

6. **완료 보고**: 저장된 공고의 제목, 기관명, 마감일을 알려줍니다. 대시보드 URL: https://govjob-v2.vercel.app

## 상태값 기준
- 기본값: `bookmarked` (관심)
- 사용자가 명시하면 변경: `planning`(지원예정), `applied`(지원완료)

## 예시 호출
```
/add-job https://www.work.go.kr/empInfo/empInfoSrch/detail/...
/add-job https://recruit.kakao.com/... --status planning
```

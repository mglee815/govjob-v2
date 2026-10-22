// 공고에 "10월 3주차", "11월 중순"처럼 정확한 날짜 없이 적혀 있는 일정은 대략적인 날짜를 넣고
// 그 컬럼 이름을 estimated_fields("a,b")에 적어둔다. 화면에서는 이런 날짜 앞에 "~"를 붙여 확정 전임을 보여준다.

export function parseEstimated(v: string | null | undefined): Set<string> {
  return new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

export function isEstimated(v: string | null | undefined, field: string): boolean {
  return parseEstimated(v).has(field);
}

// 날짜를 직접 확정해서 입력하면 예정 표시를 해제
export function removeEstimate(v: string | null | undefined, field: string): string | null {
  const s = parseEstimated(v);
  s.delete(field);
  return s.size ? Array.from(s).join(",") : null;
}

// "YYYY-MM-DD" 문자열을 로컬 자정으로 파싱해서 TZ 시프트 버그를 방지한다.
// new Date("2026-07-11") 는 UTC 자정으로 파싱되므로 KST(+9)에서 9시간 밀려 D-1로 보이는 문제 발생.

export const DAY_MS = 86_400_000;
export const TODAY_MS = new Date().setHours(0, 0, 0, 0);

export function parseLocalDate(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date(s).getTime();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

// 오늘 기준 며칠 뒤인지. 0 = 오늘, 음수 = 지남, 양수 = 이후.
export function daysFromToday(dateStr: string | null | undefined): number | null {
  const t = parseLocalDate(dateStr);
  if (t === null) return null;
  return Math.round((t - TODAY_MS) / DAY_MS);
}

#!/bin/bash
# PreToolUse hook: Edit/Write 실행 전에 원격 변경사항이 있는지 체크
# 원격이 앞서 있으면 exit 2로 도구 사용을 차단하고 Claude에게 pull 필요를 알림
#
# 등록 위치: .claude/settings.json (PreToolUse, matcher: Edit|Write|NotebookEdit|MultiEdit)

set -u

# 프로젝트 루트로 이동 (Claude Code가 넣어주는 환경변수 사용, 없으면 스크립트 위치 기준)
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  cd "$CLAUDE_PROJECT_DIR" || exit 0
else
  cd "$(dirname "$0")/../.." || exit 0
fi

# git 저장소가 아니면 통과
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# 원격 정보 갱신 (10초 안에 안 오면 포기하고 통과 — 오프라인 대비)
if ! timeout 10 git fetch origin main --quiet 2>/dev/null; then
  echo "[check-pull] git fetch 실패(오프라인?). 로컬 상태로 진행." >&2
  exit 0
fi

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
BASE=$(git merge-base HEAD origin/main 2>/dev/null)

if [ -z "$REMOTE" ] || [ -z "$BASE" ]; then
  # 원격 참조 없음 (초기화 안 됐거나) — 통과
  exit 0
fi

# Case 1: 완전 동기화 → 통과
if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

# Case 2: 원격이 앞섬 (behind) → 차단
if [ "$LOCAL" = "$BASE" ]; then
  BEHIND=$(git log --oneline HEAD..origin/main | head -5)
  cat >&2 <<EOF
[check-pull] 🛑 원격에 새 커밋이 있습니다. 파일을 수정하기 전에 pull이 필요합니다.

원격에만 있는 커밋:
$BEHIND

먼저 다음을 실행하세요:
  git pull origin main

pull 완료 후 다시 수정을 시도해주세요. (충돌 방지)
EOF
  exit 2
fi

# Case 3: 로컬만 앞섬 (ahead) → 통과 (사용자 로컬 커밋 있음, 정상)
if [ "$REMOTE" = "$BASE" ]; then
  exit 0
fi

# Case 4: 분기됨 (diverged) → 차단
AHEAD=$(git log --oneline origin/main..HEAD | head -5)
BEHIND=$(git log --oneline HEAD..origin/main | head -5)
cat >&2 <<EOF
[check-pull] 🛑 로컬과 원격이 분기됐습니다. 병합이 필요합니다.

로컬에만 있는 커밋:
$AHEAD

원격에만 있는 커밋:
$BEHIND

권장:
  git pull --rebase origin main

충돌이 발생하면 해결 후 rebase 계속하거나, 사용자와 상의해 처리하세요.
EOF
exit 2

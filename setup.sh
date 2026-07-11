#!/bin/bash
# ============================================================
# govjob-v2 초기 셋업 스크립트
# 클론 직후 1회 실행: bash setup.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[ERR]${NC} $1"; }

echo ""
echo "========================================="
echo "  govjob-v2 초기 환경 셋업"
echo "========================================="
echo ""

# ---- 1. Node.js 버전 체크 ----
if ! command -v node &>/dev/null; then
  fail "Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 v20 이상을 설치하세요."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js v20 이상이 필요합니다. 현재: $(node -v)"
  exit 1
fi
info "Node.js $(node -v) 확인"

# ---- 2. npm install ----
if [ ! -d "node_modules" ]; then
  echo ""
  echo "의존성 설치 중..."
  npm install
  info "npm install 완료"
else
  info "node_modules 이미 존재 (건너뜀)"
fi

# ---- 3. .env.local 생성 ----
if [ ! -f ".env.local" ]; then
  if [ -f ".env.local.example" ]; then
    cp .env.local.example .env.local
    warn ".env.local 생성됨 (.env.local.example 복사)"
    warn "→ 자체 Supabase 프로젝트를 사용하려면 .env.local의 키를 수정하세요"
  else
    fail ".env.local.example 파일이 없습니다"
  fi
else
  info ".env.local 이미 존재 (건너뜀)"
fi

# ---- 4. Claude Code CLI 확인 ----
echo ""
if command -v claude &>/dev/null; then
  info "Claude Code CLI 설치됨: $(claude --version 2>/dev/null || echo '버전 확인 불가')"
else
  warn "Claude Code CLI가 설치되어 있지 않습니다"
  echo "   설치하려면: npm install -g @anthropic-ai/claude-code"
  echo "   설치 후 이 폴더에서 'claude'를 실행하면 스킬/프로필/훅이 자동 로드됩니다."
fi

# ---- 5. Claude in Chrome 확장 안내 ----
echo ""
echo "-----------------------------------------"
echo "  Chrome 확장 프로그램 (선택, 권장)"
echo "-----------------------------------------"
echo ""
echo "  /add-job 스킬이 SPA 채용 사이트에서 정보를 추출하려면"
echo "  Chrome 확장 프로그램이 필요합니다."
echo ""
echo "  [공식 확장] Claude in Chrome"
echo "    → Chrome 웹 스토어에서 'Claude in Chrome' 검색 후 설치"
echo "    → 일부 도메인이 서버 측에서 차단될 수 있음"
echo ""
echo "  [오픈소스 포크 — 도메인 제한 없음]"
echo "    → https://github.com/nicobailon/open-claude-in-chrome"
echo "    → git clone 후 chrome://extensions에서 개발자 모드로 로드"
echo "    → 모든 채용 사이트에 자동 네비게이션 가능"
echo ""

# ---- 6. 빌드 테스트 ----
echo "-----------------------------------------"
echo "  빌드 확인"
echo "-----------------------------------------"
echo ""
read -p "빌드 테스트를 실행할까요? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm run build
  info "빌드 성공"
else
  info "빌드 테스트 건너뜀"
fi

# ---- 완료 ----
echo ""
echo "========================================="
echo -e "  ${GREEN}셋업 완료!${NC}"
echo "========================================="
echo ""
echo "  시작하기:"
echo "    npm run dev        → http://localhost:3000"
echo "    claude             → Claude Code 세션 시작"
echo "    /add-job <URL>     → 채용 공고 추가"
echo ""
echo "  자세한 내용: README.md"
echo ""

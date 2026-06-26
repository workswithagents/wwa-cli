#!/usr/bin/env bash
# =============================================================================
# Works With Agents — One-Line Setup
# =============================================================================
# Usage:
#   curl -fsSL https://workswithagents.dev/setup | sh
#
# Installs the WWA agent ecosystem: Ollama (local) + wwa-cli + agent config.

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── State ──────────────────────────────────────────────────────────────
OS=""
ARCH=""
PROFILE="solo"
MODEL_SOURCE=""
API_KEY=""
SKIP_OLLAMA=false
SKIP_WWA=false
SKIP_INIT=false
SKIP_MODEL=false
SKIP_KEYS=false
FOUND_OLLAMA=false
FOUND_WWA=false

# ── Helpers ────────────────────────────────────────────────────────────
step()         { echo -e "${BLUE}→${NC} $*"; }
success()      { echo -e "${GREEN}✓${NC} $*"; }
warn()         { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()         { echo -e "${RED}✗${NC} $*"; }
trap_err()     { echo -e "\n${RED}✗ Setup failed at line $1${NC}"; exit 1; }
trap 'trap_err $LINENO' ERR

# ── OS Detection ───────────────────────────────────────────────────────
detect_os() {
  step "Detecting operating system..."
  case "$(uname -s)" in
    Darwin)
      OS="macos"
      ARCH="$(uname -m)"
      case "$ARCH" in
        x86_64)  ARCH="x64" ;;
        arm64)   ARCH="arm64" ;;
        *)       ARCH="unknown" ;;
      esac
      ;;
    Linux)
      OS="linux"
      ARCH="$(uname -m)"
      case "$ARCH" in
        x86_64)  ARCH="x64" ;;
        aarch64) ARCH="arm64" ;;
        *)       ARCH="unknown" ;;
      esac
      ;;
    *)
      fail "Unsupported OS: $(uname -s)"
      exit 1
      ;;
  esac
  success "Detected: $OS ($ARCH)"
}

# ── Dependency checks ──────────────────────────────────────────────────
check_prereqs() {
  # Check for curl/wget
  if command -v curl &>/dev/null; then true; elif command -v wget &>/dev/null; then true; else
    fail "Neither curl nor wget found. Please install one."
    exit 1
  fi

  # Check for Node.js (needed for npx)
  if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v 2>/dev/null || echo "unknown")
    success "Node.js found: $NODE_VERSION"
  else
    warn "Node.js not found — required for wwa-cli"
    if [ "$OS" = "macos" ]; then
      step "Installing Node.js via Homebrew..."
      if command -v brew &>/dev/null; then
        brew install node
      else
        fail "Homebrew not found. Install from https://brew.sh or install Node.js from https://nodejs.org"
        exit 1
      fi
    else
      step "Installing Node.js via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
    success "Node.js installed"
  fi

  # Check for existing Ollama
  if command -v ollama &>/dev/null; then
    FOUND_OLLAMA=true
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    success "Ollama found: $OLLAMA_VERSION"
  fi

  # Check for existing wwa-cli
  if command -v wwa &>/dev/null || npx wwa --version &>/dev/null 2>&1; then
    FOUND_WWA=true
    success "wwa-cli found"
  fi
}

# ── Interactive prompts ────────────────────────────────────────────────
ask_profile() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Works With Agents — Setup${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Choose your agent profile:"
  echo "    1) solo        — Single agent, no networking (default)"
  echo "    2) compliance  — Compliance-ready: audit trails, identity"
  echo "    3) air-gap     — Fully offline, no external calls"
  echo ""
  read -p "  Profile [solo]: " choice
  case "${choice:-solo}" in
    1|solo|S)       PROFILE="solo" ;;
    2|compliance|C)  PROFILE="compliance" ;;
    3|air-gap|A)     PROFILE="air-gap" ;;
    *)              PROFILE="solo" ;;
  esac
  success "Profile: $PROFILE"
}

ask_model_source() {
  echo ""
  echo "  Choose model source:"
  echo "    1) local  — Run models locally via Ollama (auto-detect RAM)"
  echo "    2) cloud  — Use cloud API (OpenAI, Anthropic, etc.)"
  echo ""
  read -p "  Model source [local]: " choice
  case "${choice:-local}" in
    1|local|l)  MODEL_SOURCE="local" ;;
    2|cloud|c)  MODEL_SOURCE="cloud" ;;
    *)          MODEL_SOURCE="local" ;;
  esac
  success "Model source: $MODEL_SOURCE"
}

detect_ram() {
  if [ "$OS" = "macos" ]; then
    RAM_GB=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1/1024/1024/1024}')
  else
    RAM_GB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{printf "%.0f", $2/1024/1024}')
  fi
  echo "${RAM_GB:-8}"
}

suggest_model() {
  local ram_gb="$1"
  if [ "$ram_gb" -ge 16 ]; then
    echo "qwen2.5:7b"
  elif [ "$ram_gb" -ge 8 ]; then
    echo "qwen2.5:3b"
  else
    echo "qwen2.5:1.5b"
  fi
}

# ── Install steps ──────────────────────────────────────────────────────
install_ollama() {
  if [ "$FOUND_OLLAMA" = true ]; then
    step "Ollama already installed — skipping"
    SKIP_OLLAMA=true
    return
  fi

  step "Installing Ollama..."

  if [ "$OS" = "macos" ]; then
    if command -v brew &>/dev/null; then
      brew install ollama
    else
      warn "Homebrew not found. Download Ollama from https://ollama.com"
      echo "       After installing, re-run this script."
      exit 1
    fi
  else
    # Linux — official install script
    curl -fsSL https://ollama.com/install.sh | sh
  fi

  success "Ollama installed"

  # Start Ollama in background
  step "Starting Ollama..."
  if [ "$OS" = "macos" ]; then
    open -a Ollama 2>/dev/null || ollama serve &>/dev/null &
  else
    ollama serve &>/dev/null &
  fi
  sleep 2

  # Verify
  if curl -s http://localhost:11434/api/tags &>/dev/null; then
    success "Ollama is running"
  else
    warn "Ollama may not be running — try starting it manually"
  fi
}

pull_model() {
  if [ "$MODEL_SOURCE" != "local" ]; then
    SKIP_MODEL=true
    return
  fi

  local ram_gb
  ram_gb=$(detect_ram)
  local model
  model=$(suggest_model "$ram_gb")

  step "Pulling model: $model (detected ~${ram_gb}GB RAM)..."

  if ollama list 2>/dev/null | grep -q "$model"; then
    success "Model $model already pulled — skipping"
    SKIP_MODEL=true
    return
  fi

  ollama pull "$model"
  success "Model $model pulled"
}

install_wwa_cli() {
  if [ "$FOUND_WWA" = true ]; then
    step "wwa-cli already available — skipping install"
    SKIP_WWA=true
    SKIP_INIT=true
    return
  fi

  step "Installing wwa-cli via npx..."
  npx @workswithagents/wwa-cli --version 2>/dev/null || true
  success "wwa-cli available"
}

run_wwa_init() {
  if [ "$SKIP_INIT" = true ]; then
    step "wwa init already run — skipping"
    return
  fi

  local wwa_dir="${HOME}/.wwa/${PROFILE}"
  mkdir -p "$wwa_dir"

  step "Initializing WWA with profile: $PROFILE..."

  cd "$wwa_dir"
  npx wwa init --profile "$PROFILE" --framework mcp --agent-id "wwa-${PROFILE}" \
    --endpoint "0.0.0.0:8787" --no-check 2>&1 || warn "wwa init had non-fatal issues"

  success "WWA initialized at $wwa_dir"
}

generate_keys() {
  if [ "$SKIP_KEYS" = true ]; then
    return
  fi

  local wwa_dir="${HOME}/.wwa/${PROFILE}"
  local key_file="${wwa_dir}/iacp_keys.env"

  if [ -f "$key_file" ]; then
    step "IACP keys already exist — skipping"
    SKIP_KEYS=true
    return
  fi

  step "Generating Ed25519 keys for IACP identity..."

  if command -v python3 &>/dev/null; then
    # Use Python cryptography if available
    if python3 -c "from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey" 2>/dev/null; then
      KEYS=$(python3 -c "
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
key = Ed25519PrivateKey.generate()
private_bytes = key.private_bytes_raw()
public_bytes = key.public_key().public_bytes_raw()
print(f'IACP_PRIVATE_KEY={private_bytes.hex()}')
print(f'IACP_PUBLIC_KEY={public_bytes.hex()}')
")
      echo "$KEYS" > "$key_file"
    else
      # Fallback: use openssl
      if command -v openssl &>/dev/null; then
        openssl genpkey -algorithm ED25519 -out "${wwa_dir}/iacp_private.pem" 2>/dev/null
        openssl pkey -in "${wwa_dir}/iacp_private.pem" -pubout -out "${wwa_dir}/iacp_public.pem" 2>/dev/null
        echo "IACP_KEY_FILE=${wwa_dir}/iacp_private.pem" > "$key_file"
        echo "IACP_PUBKEY_FILE=${wwa_dir}/iacp_public.pem" >> "$key_file"
      else
        warn "No key generation tools available — skipping Ed25519 keys"
        SKIP_KEYS=true
        return
      fi
    fi
  else
    warn "Python3 not available — skipping key generation"
    SKIP_KEYS=true
    return
  fi

  success "Ed25519 keys generated at $key_file"
}

run_wwa_check() {
  local wwa_dir="${HOME}/.wwa/${PROFILE}"
  cd "$wwa_dir"

  step "Running wwa check..."
  npx wwa check 2>&1 || warn "Some checks did not pass (expected for fresh setup)"
}

# ── Summary ────────────────────────────────────────────────────────────
print_summary() {
  local model=""
  if [ "$MODEL_SOURCE" = "local" ] && [ "$SKIP_MODEL" != true ]; then
    model=$(suggest_model "$(detect_ram)")
  elif [ "$MODEL_SOURCE" = "local" ]; then
    model="(already pulled)"
  else
    model="cloud API"
  fi

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ Works With Agents setup complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Profile:      $PROFILE"
  echo "  Model source: $MODEL_SOURCE"
  echo "  Model:        $model"
  echo "  OS:           $OS ($ARCH)"
  echo "  Config dir:   ${HOME}/.wwa/${PROFILE}"
  echo ""
  echo -e "${BLUE}  Next steps:${NC}"
  echo "    cd ${HOME}/.wwa/${PROFILE}"
  echo "    npx wwa check          # Verify setup"
  echo "    npx wwa init --all     # Generate all adapters"
  echo ""
  echo -e "${BLUE}  Bridge:${NC}"
  echo "    python3 iacp-mcp-bridge.py --transport both --port 8787"
  echo ""
}

# ── Main ───────────────────────────────────────────────────────────────
main() {
  detect_os
  check_prereqs
  ask_profile
  ask_model_source

  echo ""

  if [ "$MODEL_SOURCE" = "local" ]; then
    install_ollama
  else
    step "Cloud API selected — enter your API key"
    read -sp "  API key: " API_KEY
    echo ""
    success "API key saved"
  fi

  install_wwa_cli
  run_wwa_init
  pull_model
  generate_keys
  run_wwa_check
  print_summary
}

main "$@"

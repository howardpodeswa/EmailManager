#!/usr/bin/env bash
# EmailManager workshop: check this Mac is ready, and install the free developer tools that don't need a password.
#
# Attendees run it once before the workshop by pasting this line into Terminal:
#   curl -fsSL https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/workshop/check_mac.sh | bash
#
# What it does (safe to run again any time):
#   - checks macOS, free disk space and memory
#   - checks the Claude app and Docker Desktop are installed, and starts Docker Desktop if it's closed
#   - starts Apple's Command Line Tools installer if they're missing (a window opens: click Install)
#   - installs nvm, Node.js 22.19 and pnpm 11 in your home folder (no password needed)
#   - creates the ~/Workshop folder
# It never asks for your password and never changes anything outside your home folder.

set -o pipefail

NODE_VERSION=22.19.0
PNPM_VERSION=11.20.0
NVM_VERSION=v0.40.1
READY=1

ok() { printf '  \033[32m✔\033[0m %s\n' "$*"; }
todo() {
    printf '  \033[31m✘\033[0m %s\n' "$*"
    READY=0
}
info() { printf '    %s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

printf '\n\033[1mEmailManager workshop: checking your Mac\033[0m\n'

step "1. Your Mac"
macos="$(sw_vers -productVersion 2>/dev/null)"
major="${macos%%.*}"
if [ -n "$major" ] && [ "$major" -ge 13 ]; then ok "macOS $macos"; else todo "macOS $macos: version 13 (Ventura) or newer is needed. Update macOS in System Settings."; fi
free_gb="$(df -g "$HOME" | awk 'NR==2 {print $4}')"
if [ "${free_gb:-0}" -ge 15 ]; then ok "${free_gb} GB free disk space"; else todo "Only ${free_gb} GB free: please free up at least 15 GB."; fi
mem_gb=$(($(sysctl -n hw.memsize) / 1073741824))
if [ "$mem_gb" -ge 8 ]; then ok "${mem_gb} GB memory"; else todo "${mem_gb} GB memory: 8 GB or more is recommended."; fi

step "2. Apps you install yourself"
if [ -d "/Applications/Claude.app" ]; then ok "Claude app installed"; else todo "Claude app not found. Download it from https://claude.com/download and sign in with your workshop invitation email."; fi
if [ -d "/Applications/Docker.app" ]; then
    ok "Docker Desktop installed"
    if ! docker info >/dev/null 2>&1; then
        info "Starting Docker Desktop (it can take a minute)…"
        open -a Docker
        for _ in $(seq 1 60); do
            docker info >/dev/null 2>&1 && break
            sleep 2
        done
    fi
    if docker info >/dev/null 2>&1; then ok "Docker Desktop is running"; else todo "Docker Desktop didn't start. Open it from Applications, accept its terms, wait until it says it's running, then run this check again."; fi
else
    todo "Docker Desktop not found. Download 'Docker Desktop for Mac' from https://www.docker.com/products/docker-desktop/ (choose Apple chip or Intel chip to match your Mac), drag it to Applications, open it once and accept its terms."
fi

step "3. Apple Command Line Tools (gives your Mac 'git')"
if xcode-select -p >/dev/null 2>&1; then
    ok "Command Line Tools installed"
else
    xcode-select --install >/dev/null 2>&1
    todo "A window has opened asking to install the Command Line Tools. Click Install, wait for it to finish (5–15 minutes), then run this check again."
fi

step "4. Developer tools (installed for you, no password needed)"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    info "Installing nvm (manages Node.js versions)…"
    touch "$HOME/.zshrc"
    if curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" | PROFILE="$HOME/.zshrc" bash >/dev/null 2>&1; then
        ok "nvm installed"
    else
        todo "nvm didn't install. Check your internet connection and run this check again."
    fi
else
    ok "nvm installed"
fi
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    if ! nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
        info "Installing Node.js $NODE_VERSION…"
        nvm install "$NODE_VERSION" >/dev/null 2>&1
    fi
    if nvm use "$NODE_VERSION" >/dev/null 2>&1; then
        ok "Node.js $(node -v)"
        if [ -z "$(nvm alias default 2>/dev/null | grep -o 'v[0-9]')" ]; then nvm alias default "$NODE_VERSION" >/dev/null 2>&1; fi
        export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
        corepack enable >/dev/null 2>&1
        corepack prepare "pnpm@$PNPM_VERSION" --activate >/dev/null 2>&1
        if pnpm -v >/dev/null 2>&1; then ok "pnpm $(pnpm -v)"; else todo "pnpm didn't install. Run this check again; if it still fails, tell the facilitator."; fi
    else
        todo "Node.js $NODE_VERSION didn't install. Run this check again; if it still fails, tell the facilitator."
    fi
fi

step "5. Workshop folder"
mkdir -p "$HOME/Workshop" && ok "Folder ready: $HOME/Workshop"

step "6. Free ports for the workshop app"
for port in 5190 3701 5460 5461; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then info "Port $port is in use (that's OK: Claude will pick other ports)."; fi
done
ok "Checked"

echo
if [ "$READY" = 1 ]; then
    printf '\033[32m\033[1mYour Mac is ready for the workshop.\033[0m\n\n'
else
    printf '\033[31m\033[1mAlmost there: fix the items marked ✘ above, then run this check again.\033[0m\n'
    printf 'If you get stuck, send a screenshot of this window to the facilitator.\n\n'
fi

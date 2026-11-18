#!/usr/bin/env bash
# Installs the build-app-from-requirements skill for Claude on this Mac by linking it into ~/.claude/skills,
# so it always matches docs/creator-kit/skill. With --zip, instead builds a .zip to upload to claude.ai.

set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILL_DIR="$ROOT/docs/creator-kit/skill/build-app-from-requirements"
NAME="build-app-from-requirements"

if [ "${1:-}" = "--zip" ]; then
    OUT="$ROOT/docs/creator-kit/skill/$NAME.zip"
    rm -f "$OUT"
    (cd "$ROOT/docs/creator-kit/skill" && zip -qr "$OUT" "$NAME" -x '*/README.md')
    echo "Created $OUT. Upload it in claude.ai under Settings → Capabilities → Skills."
    exit 0
fi

TARGET_DIR="$HOME/.claude/skills"
mkdir -p "$TARGET_DIR"
if [ -e "$TARGET_DIR/$NAME" ] && [ ! -L "$TARGET_DIR/$NAME" ]; then
    echo "$TARGET_DIR/$NAME already exists and isn't a link. Move it aside, then run this again." >&2
    exit 1
fi
ln -sfn "$SKILL_DIR" "$TARGET_DIR/$NAME"
echo "Installed: $TARGET_DIR/$NAME → $SKILL_DIR"
echo "Restart Claude (or start a new session) to pick it up."

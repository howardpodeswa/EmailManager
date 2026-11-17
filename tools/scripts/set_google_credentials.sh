#!/usr/bin/env bash
# Asks for the Google OAuth Client ID and Client secret and writes them into the repo-root .env
# (gitignored). The secret isn't shown on screen while you paste it. Run from anywhere in the repo.

set -eo pipefail

ROOT="$(git rev-parse --show-toplevel)"
ENV_FILE="$ROOT/.env"
[ -f "$ENV_FILE" ] || cp "$ROOT/.env.example" "$ENV_FILE"

printf 'Paste the Client ID (ends in .apps.googleusercontent.com), then press Return:\n> '
read -r CLIENT_ID
printf 'Paste the Client secret (starts with GOCSPX-), then press Return. It will not be shown:\n> '
read -rs CLIENT_SECRET
printf '\n'

CLIENT_ID="$(printf '%s' "$CLIENT_ID" | tr -d '[:space:]"')"
CLIENT_SECRET="$(printf '%s' "$CLIENT_SECRET" | tr -d '[:space:]"')"

case "$CLIENT_ID" in
*.apps.googleusercontent.com) ;;
*)
    echo "That Client ID doesn't end in .apps.googleusercontent.com. Nothing was changed." >&2
    exit 1
    ;;
esac
if [ -z "$CLIENT_SECRET" ]; then
    echo "The Client secret was empty. Nothing was changed." >&2
    exit 1
fi

TMP="$(mktemp)"
grep -v -e '^GOOGLE_CLIENT_ID=' -e '^GOOGLE_CLIENT_SECRET=' "$ENV_FILE" >"$TMP" || true
{
    printf 'GOOGLE_CLIENT_ID=%s\n' "$CLIENT_ID"
    printf 'GOOGLE_CLIENT_SECRET=%s\n' "$CLIENT_SECRET"
    cat "$TMP"
} >"$ENV_FILE"
rm -f "$TMP"
chmod 600 "$ENV_FILE"

echo "Saved the Google Client ID and secret to $ENV_FILE"

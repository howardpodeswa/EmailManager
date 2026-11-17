#!/usr/bin/env bash
# Double-click in Finder to stop EmailManager (the database keeps running in Docker).
exec "$(cd "$(dirname "$0")" && pwd)/stop.sh" "$@"

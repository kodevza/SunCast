#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
APP_URL="${APP_URL:-http://127.0.0.1:4173/}"

if [[ ! -f "$PWCLI" ]]; then
  echo "Playwright wrapper not found at: $PWCLI" >&2
  exit 1
fi

pw() {
  bash "$PWCLI" "$@"
}

echo "[playwright] Resetting session and opening $APP_URL"
pw close-all >/dev/null || true
pw open "$APP_URL" --headed >/dev/null

echo "[playwright] Drawing 3-point footprint"
pw eval "(document.querySelector('[data-testid=\"draw-footprint-button\"]')?.click(), 'ok')" >/dev/null
pw mousemove 930 230 >/dev/null
pw mousedown left >/dev/null
pw mouseup left >/dev/null
pw mousemove 1110 260 >/dev/null
pw mousedown left >/dev/null
pw mouseup left >/dev/null
pw mousemove 980 420 >/dev/null
pw mousedown left >/dev/null
pw mouseup left >/dev/null
pw eval "(document.querySelector('[data-testid=\"draw-finish-button\"]')?.click(), 'ok')" >/dev/null

echo "[playwright] Setting 3 vertex heights"
pw eval "(document.querySelector('[data-testid=\"vertex-height-input-0\"]').value='2',document.querySelector('[data-testid=\"vertex-height-input-0\"]').dispatchEvent(new Event('input',{bubbles:true})),document.querySelector('[data-testid=\"vertex-height-set-0\"]').click(),document.querySelector('[data-testid=\"vertex-height-input-1\"]').value='4',document.querySelector('[data-testid=\"vertex-height-input-1\"]').dispatchEvent(new Event('input',{bubbles:true})),document.querySelector('[data-testid=\"vertex-height-set-1\"]').click(),document.querySelector('[data-testid=\"vertex-height-input-2\"]').value='6',document.querySelector('[data-testid=\"vertex-height-input-2\"]').dispatchEvent(new Event('input',{bubbles:true})),document.querySelector('[data-testid=\"vertex-height-set-2\"]').click(),'ok')" >/dev/null

echo "[playwright] Enabling Orbit and rotating map"
pw eval "(document.querySelector('[data-testid=\"orbit-toggle-button\"]')?.click(), 'ok')" >/dev/null
pw mousemove 1020 330 >/dev/null
pw mousedown left >/dev/null
pw mousemove 1180 330 >/dev/null
pw mousemove 1220 390 >/dev/null
pw mouseup left >/dev/null

echo "[playwright] Collecting console logs"
pw console >/dev/null

LATEST_CONSOLE_FILE="$(ls -1t .playwright-cli/console-*.log | head -n 1)"
echo
echo "[playwright] Latest console log: $LATEST_CONSOLE_FILE"
echo "[playwright] Filtered roof diagnostics:"
grep -E "\\[roof-(gl-state|mvp|z-units|layer)\\]|pitchDeg|mapPitchDeg|mapRelativeAzimuthDeg" "$LATEST_CONSOLE_FILE" || true

#!/bin/bash
# Deploy luciddreamer.ai — welcome page + mirrored Compass Head Radio Hour at /compass-head/
# The mirror is generated from the ai-writings repo (source of truth), then uploaded to Pages.
set -e
RH="/home/eileen/projects/ai-writings/radio-theater/compass-head-radio-hour"
echo "=== 1) mirror compass-head-radio-hour -> public/compass-head/ ==="
rsync -a --delete --exclude='*.py' --exclude='__pycache__' --exclude='.git' "$RH/" public/compass-head/
echo "=== 2) copy escaping doc links into the mirror (dreams + journals) ==="
mkdir -p public/compass-head/dreams public/compass-head/journals
cp /home/eileen/projects/ai-writings/dreams/2026-08-14-the-compass-head.md public/compass-head/dreams/ 2>/dev/null || true
cp /home/eileen/projects/ai-writings/journals/lucineer-onboarding.md public/compass-head/journals/ 2>/dev/null || true
echo "=== 3) deploy to Pages project 'luciddreamer' ==="
wrangler pages deploy public --project-name luciddreamer --branch main
echo "=== done — luciddreamer.ai is live ==="

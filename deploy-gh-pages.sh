#!/usr/bin/env bash
# ============================================================
# Deploy FreightFlow to GitHub Pages (one command).
# Run this from the repo root after pushing main:
#     bash deploy-gh-pages.sh
# Prerequisites: git auth configured (gh CLI, SSH key, or PAT).
# ============================================================
set -euo pipefail

# Determine repo name automatically (GitHub Pages project-site path)
REMOTE_URL=$(git config --get remote.origin.url)
REPO_NAME=$(basename "$REMOTE_URL" .git)
echo "==> Deploying FreightFlow to GitHub Pages ($REPO_NAME)"

# Clean
rm -rf out
# Build with the correct basePath for a project site
echo "==> Running static build (basePath=/$REPO_NAME)…"
NEXT_PUBLIC_BASE_PATH="/$REPO_NAME" npm run build

# Small safety: drop any Turbopack debug artifacts that may leak
find out -name '__next.*' -delete
find out -name 'index.txt' -delete
# Ensure .nojekyll + 404.html are present
touch out/.nojekyll
[ -f out/404/index.html ] && cp out/404/index.html out/404.html || true

echo "==> Publishing out/ to gh-pages branch…"
# Use git worktree to avoid disturbing main
BRANCH=gh-pages
WORK=$(mktemp -d)
git fetch origin "$BRANCH" 2>/dev/null && HAS_BRANCH=1 || HAS_BRANCH=0
if [ "$HAS_BRANCH" = "1" ]; then
  git worktree add "$WORK" "$BRANCH"
else
  git worktree add --orphan "$WORK" "$BRANCH"
  cd "$WORK" && git rm -rf . >/dev/null 2>&1 || true && cd - >/dev/null
fi
# Copy build
rm -rf "$WORK"/* "$WORK"/.[!.]* 2>/dev/null || true
cp -a out/. "$WORK"/
cd "$WORK"
touch .nojekyll
git add -A
if git diff --cached --quiet; then
  echo "==> No changes to deploy."
else
  git -c user.email="deploy@freightflow.dev" -c user.name="FreightFlow Deploy" \
      commit -m "Deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push -u origin "$BRANCH" --force
fi
cd - >/dev/null
git worktree remove --force "$WORK"

echo ""
echo "✅  Deployed. Enable GitHub Pages in repo settings:"
echo "    Settings → Pages → Source: 'Deploy from a branch'"
echo "    Branch: gh-pages / (root)"
echo ""
echo "    Your beta URL will be: https://$(git config --get remote.origin.url | sed -E 's#.*github.com[/:]([^/]+)/.*#\1#').github.io/$REPO_NAME/"

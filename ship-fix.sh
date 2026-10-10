#!/bin/sh
# Commits whatever Claude changed in the app and pushes it so Vercel rebuilds.
#
# Run this after Claude tells you something is ready:
#     cd ~/Desktop/PetCommunity-MVP && ./ship-fix.sh
#
# Optional: give it your own message -> ./ship-fix.sh "my message"
set -e
cd "$(dirname "$0")"

# The sandbox Claude works in cannot delete files here, so every git command it
# runs leaves a lock file behind that blocks the next one. Clearing them is safe
# as long as you do not have another git command running right now.
echo "Clearing stale git locks..."
rm -f .git/HEAD.lock .git/index.lock .git/refs/heads/*.lock
rm -f .git/objects/*/tmp_obj_* 2>/dev/null || true

# The serverless function in api/ is typechecked by Vercel during the build,
# with this repo's settings, which do not include the browser library. That is
# a build failure you would otherwise only hear about from a red X two minutes
# after pushing, so it is worth checking first.
#
# Worth checking, not worth blocking on: node is not always on the PATH here,
# and a missing checker is no reason to stop you shipping. If it cannot be
# found this says so and carries on.
NODE=""
for candidate in \
  "$(command -v node 2>/dev/null)" \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  /usr/bin/node \
  "$HOME"/.nvm/versions/node/*/bin/node \
  "$HOME"/.volta/bin/node \
  "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then NODE="$candidate"; break; fi
done

TSC="node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc"
if [ -d api ] && [ -n "$NODE" ] && [ -f "$TSC" ]; then
  echo "Checking the API..."
  if ! "$NODE" "$TSC" --noEmit --lib es2022 --target es2022 --module esnext \
      --moduleResolution bundler --strict --skipLibCheck api/*.ts; then
    echo
    echo "The API does not typecheck, so the deploy would fail. Nothing was pushed."
    exit 1
  fi
elif [ -d api ]; then
  echo "Skipping the API check (no node on this machine). Vercel will check it."
fi

MESSAGE=${1:-"Update PetCommunity"}

# Stage everything that is part of the app, one path at a time.
#
# This used to be a single `git add` of a fixed list, and the list named a
# folder that does not exist in this repo. git failed on the missing one,
# `|| true` swallowed the error, and NOTHING on that line was staged — which
# is how the whole serverless API shipped as "nothing to commit" while
# looking like a successful deploy. One path at a time, so one missing folder
# cannot take the rest down with it.
for path in api artifacts lib scripts vercel.json package.json pnpm-workspace.yaml SHARED-DATA.md README.md; do
  if [ -e "$path" ]; then
    git add -A "$path"
  fi
done

# Anything else new that is not ignored — so a file added in a new folder is
# never silently left behind again.
git add -A .

if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  echo "Committing..."
  git commit -m "$MESSAGE"
fi

echo "Pushing..."
git push

echo
echo "Done. Vercel is building - give it about a minute, then hard-refresh with"
echo "Cmd+Shift+R:  https://petcommunity-mvp.vercel.app/give"

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

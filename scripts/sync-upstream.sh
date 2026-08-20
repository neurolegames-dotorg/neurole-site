#!/usr/bin/env bash
# Pull the latest main into the working branch, unattended.
#
# The client pushes straight to main several times a day, so a branch left
# alone drifts fast and the merge only gets harder the longer it waits. This
# runs on a schedule and does the boring part.
#
# Deliberately cautious: it never rewrites history, never force-pushes, never
# pushes at all, and never leaves the repository mid-merge. If the merge does
# not apply cleanly it aborts and writes a note saying a human is needed. A
# conflict that needs judgement is exactly what a scheduled job must not guess
# at.
#
# Usage:  bash scripts/sync-upstream.sh [branch]   (default: current branch)
# Log:    scripts/sync-upstream.log
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1
mkdir -p "$REPO/scripts"
LOG="$REPO/scripts/sync-upstream.log"
UPSTREAM="origin/main"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
log "--- sync start (branch: $BRANCH) ---"

if [ "$BRANCH" = "HEAD" ]; then
  log "SKIP: detached HEAD, nothing to sync onto"
  exit 0
fi

# Never run on top of an unfinished merge, rebase or bisect.
if [ -e .git/MERGE_HEAD ] || [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  log "SKIP: a merge or rebase is already in progress - leaving it alone"
  exit 0
fi

# Uncommitted work is stashed, not discarded, and put back at the end.
STASHED=0
if [ -n "$(git status --porcelain)" ]; then
  if git stash push -u -m "sync-upstream auto-stash" >> "$LOG" 2>&1; then
    STASHED=1
    log "stashed uncommitted changes"
  else
    log "ABORT: could not stash local changes"
    exit 1
  fi
fi

restore_stash() {
  if [ "$STASHED" = "1" ]; then
    if git stash pop >> "$LOG" 2>&1; then
      log "restored stashed changes"
    else
      log "WARNING: stash could not be reapplied automatically - it is safe in 'git stash list'"
    fi
  fi
}

if ! git fetch --prune origin >> "$LOG" 2>&1; then
  log "ABORT: fetch failed (offline, or no access to origin)"
  restore_stash
  exit 1
fi

BEHIND="$(git rev-list --count "HEAD..$UPSTREAM" 2>/dev/null || echo 0)"
if [ "$BEHIND" = "0" ]; then
  log "already up to date with $UPSTREAM"
  restore_stash
  log "--- sync end ---"
  exit 0
fi

log "$BEHIND new commit(s) on $UPSTREAM:"
git log --format='    %h %an  %s' "HEAD..$UPSTREAM" >> "$LOG" 2>&1

if git merge --no-edit "$UPSTREAM" >> "$LOG" 2>&1; then
  log "merged cleanly"
  # A build failure is not a reason to unwind a clean merge - the merge is
  # still correct and the breakage is worth seeing - but say it loudly.
  if [ -f neurole-react/package.json ]; then
    if (cd neurole-react && npm run build) >> "$LOG" 2>&1; then
      log "build OK"
    else
      log "ATTENTION: merge applied but the build now fails - needs a look"
    fi
  fi
else
  git merge --abort >> "$LOG" 2>&1
  log "ATTENTION: $UPSTREAM does not merge cleanly - merge aborted, branch untouched. Resolve by hand."
fi

restore_stash
log "--- sync end ---"

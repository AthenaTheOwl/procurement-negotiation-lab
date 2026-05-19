/**
 * LearnShell — router shell for the 8-level guided journey.
 *
 * Reads the URL hash (`#/learn/N`) and renders the requested level. Gates
 * navigation behind learnProgress: jumping to a level the user hasn't
 * unlocked redirects to the highest unlocked level.
 *
 * In Phase 2, only Level 1 is wired. Levels 2-8 fall through to a
 * placeholder card that says "coming soon" — clicking Continue from a
 * placeholder just calls markComplete so the user can keep moving (this
 * placeholder mode is dropped in Phases 3-5).
 */

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Level01 } from "./Level01";
import { Level02 } from "./Level02";
import { Level03 } from "./Level03";
import { Level04 } from "./Level04";
import { Level05 } from "./Level05";
import { Level06 } from "./Level06";
import { Level07 } from "./Level07";
import { Level08 } from "./Level08";
import { LevelShell } from "../../primitives/LevelShell";
import {
  TOTAL_LEVELS,
  canEnter,
  loadProgress,
  markComplete,
  nextUnlocked,
  saveProgress,
  setLastSeen,
  type LearnProgress,
  type LevelId,
} from "../../state/learnProgress";

export interface LearnShellProps {
  level: LevelId;
  onNavigateLevel: (level: LevelId) => void;
  onOpenHome: () => void;
  onOpenSandbox: () => void;
}

export function LearnShell({
  level,
  onNavigateLevel,
  onOpenHome,
  onOpenSandbox,
}: LearnShellProps) {
  const [progress, setProgress] = useState<LearnProgress>(() => loadProgress());

  // Redirect if the user can't enter this level.
  useEffect(() => {
    if (!canEnter(progress, level)) {
      const allowed = nextUnlocked(progress);
      if (allowed !== level) {
        onNavigateLevel(allowed);
      }
      return;
    }
    const next = setLastSeen(progress, level);
    setProgress(next);
    saveProgress(next);
  }, [level, progress, onNavigateLevel]);

  const handleComplete = () => {
    const next = markComplete(progress, level);
    setProgress(next);
    saveProgress(next);
    const target = (level + 1) as LevelId;
    if (target <= TOTAL_LEVELS) {
      onNavigateLevel(target);
    } else {
      onOpenSandbox();
    }
  };

  const handleJumpTo = (target: number) => {
    const targetLevel = target as LevelId;
    if (targetLevel < 1 || targetLevel > TOTAL_LEVELS) return;
    if (canEnter(progress, targetLevel)) {
      onNavigateLevel(targetLevel);
    }
  };

  const commonProps = {
    progress,
    onComplete: handleComplete,
    onJumpTo: handleJumpTo,
    onOpenHome,
    onOpenSandbox,
  };

  if (level === 1) return <Level01 {...commonProps} />;
  if (level === 2) return <Level02 {...commonProps} />;
  if (level === 3) return <Level03 {...commonProps} />;
  if (level === 4) return <Level04 {...commonProps} />;
  if (level === 5) return <Level05 {...commonProps} />;
  if (level === 6) return <Level06 {...commonProps} />;
  if (level === 7) return <Level07 {...commonProps} />;
  if (level === 8) return <Level08 {...commonProps} />;
  return (
    <PlaceholderLevel
      level={level}
      progress={progress}
      onContinue={handleComplete}
      onJumpTo={handleJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    />
  );
}

interface PlaceholderProps {
  level: LevelId;
  progress: LearnProgress;
  onContinue: () => void;
  onJumpTo: (level: number) => void;
  onOpenHome: () => void;
  onOpenSandbox: () => void;
}

function PlaceholderLevel({
  level,
  progress,
  onContinue,
  onJumpTo,
  onOpenHome,
  onOpenSandbox,
}: PlaceholderProps) {
  const stage: CSSProperties = {
    textAlign: "center",
    padding: "var(--space-6, 32px)",
    color: "var(--neutral-fg-soft, #5b5b62)",
  };
  return (
    <LevelShell
      level={level}
      total={TOTAL_LEVELS}
      completedThrough={progress.highest_completed}
      title={`Level ${level} (coming soon)`}
      stakes="This level is wired in the next spec 0010 phase."
      continueLabel={level === TOTAL_LEVELS ? "Open Sandbox →" : "Continue → next"}
      onContinue={onContinue}
      onJumpTo={onJumpTo}
      onOpenHome={onOpenHome}
      onOpenSandbox={onOpenSandbox}
    >
      <div style={stage}>
        <p>
          Level {level} content lands in Phase {level <= 4 ? 3 : level <= 7 ? 4 : 5} of
          spec 0010. For now, clicking Continue marks this level complete so
          the rest of the flow stays unblocked.
        </p>
      </div>
    </LevelShell>
  );
}

/**
 * LearnShell — router shell for the guided journey.
 *
 * Reads the URL hash (`#/learn/N`) and renders the requested level. Gates
 * navigation behind learnProgress: jumping to a level the user hasn't
 * unlocked redirects to the highest unlocked level.
 *
 * Late, heavier levels are split into their own chunks so the first
 * screen and early levels stay light.
 */

import { Suspense, lazy, useEffect, useState } from "react";
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

const Level10 = lazy(() =>
  import("./Level10").then((module) => ({ default: module.Level10 })),
);
const Level09 = lazy(() =>
  import("./Level09").then((module) => ({ default: module.Level09 })),
);
const Level11 = lazy(() =>
  import("./Level11").then((module) => ({ default: module.Level11 })),
);

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
  if (level === 9) {
    return (
      <Suspense fallback={<div data-testid="level9-loading">Loading commitment workbench...</div>}>
        <Level09 {...commonProps} />
      </Suspense>
    );
  }
  if (level === 10) {
    return (
      <Suspense fallback={<div data-testid="level10-loading">Loading Model Studio...</div>}>
        <Level10 {...commonProps} />
      </Suspense>
    );
  }
  if (level === 11) {
    return (
      <Suspense fallback={<div data-testid="level11-loading">Loading mechanism catalog...</div>}>
        <Level11 {...commonProps} />
      </Suspense>
    );
  }
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

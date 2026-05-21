/**
 * App (mobile) — top-level state machine for procurement-negotiation-lab
 * mobile build. Hash-routing isn't a thing on RN, so we keep a simple
 * `kind / level` state.
 */

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { Level01 } from "./src/screens/learn/Level01";
import { Level02 } from "./src/screens/learn/Level02";
import { Level03 } from "./src/screens/learn/Level03";
import { Level04 } from "./src/screens/learn/Level04";
import { Level05 } from "./src/screens/learn/Level05";
import { Level06 } from "./src/screens/learn/Level06";
import { Level07 } from "./src/screens/learn/Level07";
import { Level08 } from "./src/screens/learn/Level08";
import { Level09 } from "./src/screens/learn/Level09";
import { Level10 } from "./src/screens/learn/Level10";
import { Level11 } from "./src/screens/learn/Level11";
import { SandboxStub } from "./src/screens/sandbox/SandboxStub";
import { colors } from "./src/theme/tokens";
import {
  TOTAL_LEVELS,
  emptyProgress,
  loadProgress,
  markComplete,
  saveProgress,
  type LearnProgress,
  type LevelId,
} from "./src/state/learnProgress";
import type { ComponentType } from "react";

type Route =
  | { kind: "home" }
  | { kind: "learn"; level: LevelId }
  | { kind: "sandbox" };

type LearnLevelProps = {
  progress: LearnProgress;
  onComplete: () => void;
  onJumpTo?: (level: number) => void;
  onOpenHome?: () => void;
  onOpenSandbox?: () => void;
};

const LEVEL_COMPONENTS = {
  1: Level01,
  2: Level02,
  3: Level03,
  4: Level04,
  5: Level05,
  6: Level06,
  7: Level07,
  8: Level08,
  9: Level09,
  10: Level10,
  11: Level11,
} satisfies Record<LevelId, ComponentType<LearnLevelProps>>;

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: "home" });
  const [progress, setProgress] = useState<LearnProgress>(emptyProgress());

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goLearn = (level: number) => {
    const safe = Math.max(1, Math.min(TOTAL_LEVELS, level)) as LevelId;
    setRoute({ kind: "learn", level: safe });
  };

  const goHome = () => setRoute({ kind: "home" });
  const goSandbox = () => setRoute({ kind: "sandbox" });

  const handleComplete = async (level: LevelId) => {
    const next = markComplete(progress, level);
    setProgress(next);
    await saveProgress(next);
    if (level < TOTAL_LEVELS) {
      goLearn(level + 1);
    } else {
      goSandbox();
    }
  };

  const commonProps = (level: LevelId) => ({
    progress,
    onComplete: () => handleComplete(level),
    onJumpTo: goLearn,
    onOpenHome: goHome,
    onOpenSandbox: goSandbox,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutralBg }}>
      <StatusBar style="auto" />
      {route.kind === "home" && (
        <HomeScreen onStartPlaying={goLearn} onOpenSandbox={goSandbox} />
      )}
      {route.kind === "learn" &&
        (() => {
          const Level = LEVEL_COMPONENTS[route.level];
          return <Level {...commonProps(route.level)} />;
        })()}
      {route.kind === "sandbox" && <SandboxStub onOpenHome={goHome} />}
    </SafeAreaView>
  );
}

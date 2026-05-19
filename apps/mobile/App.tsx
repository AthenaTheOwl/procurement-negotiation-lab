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

type Route =
  | { kind: "home" }
  | { kind: "learn"; level: LevelId }
  | { kind: "sandbox" };

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
      {route.kind === "learn" && route.level === 1 && <Level01 {...commonProps(1)} />}
      {route.kind === "learn" && route.level === 2 && <Level02 {...commonProps(2)} />}
      {route.kind === "learn" && route.level === 3 && <Level03 {...commonProps(3)} />}
      {route.kind === "learn" && route.level === 4 && <Level04 {...commonProps(4)} />}
      {route.kind === "learn" && route.level === 5 && <Level05 {...commonProps(5)} />}
      {route.kind === "learn" && route.level === 6 && <Level06 {...commonProps(6)} />}
      {route.kind === "learn" && route.level === 7 && <Level07 {...commonProps(7)} />}
      {route.kind === "learn" && route.level === 8 && <Level08 {...commonProps(8)} />}
      {route.kind === "sandbox" && <SandboxStub onOpenHome={goHome} />}
    </SafeAreaView>
  );
}

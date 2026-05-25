/**
 * App — top-level router for the pedagogical-redesign era.
 *
 * URL hash routes:
 *   (empty / "#/" / "#home")     → HomeSurface
 *   "#/learn/1" through "#/learn/8" → LearnShell at that level
   *   "#/sandbox"                  → SandboxShell (Buy Plan + Classic Lab Arena)
 *
 * Query parameters take precedence for the legacy `?report=<id>` route,
 * which short-circuits to the read-only ReportSurface.
 */

import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { HomeSurface } from "./surfaces/home/HomeSurface";
import { LearnShell } from "./surfaces/learn/LearnShell";
import { NegotiateSurface } from "./surfaces/negotiate/NegotiateSurface";
import { TOTAL_LEVELS, type LevelId } from "./state/learnProgress";

// Heavy surfaces are lazy-loaded so the home + learn routes don't pull
// cytoscape and the legacy sandbox bundle into the initial render path.
// Vitest workers in particular crashed importing SandboxApp at module
// init, so this keeps the App.test.tsx router tests safe.
const SandboxShell = lazy(() =>
  import("./surfaces/sandbox/SandboxShell").then((m) => ({ default: m.SandboxShell })),
);
const ReportSurface = lazy(() =>
  import("./surfaces/report/ReportSurface").then((m) => ({ default: m.ReportSurface })),
);
const FactoryConsole = lazy(() =>
  import("./surfaces/factory/FactoryConsole").then((m) => ({ default: m.FactoryConsole })),
);

type Route =
  | { kind: "home" }
  | { kind: "learn"; level: LevelId }
  | { kind: "sandbox" }
  | { kind: "negotiate" }
  | { kind: "factory" }
  | { kind: "report" };

function parseRoute(): Route {
  if (typeof window === "undefined") return { kind: "home" };
  const params = new URLSearchParams(window.location.search);
  if (params.has("report") || params.has("json")) {
    return { kind: "report" };
  }
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  if (hash === "" || hash === "home") return { kind: "home" };
  if (hash === "sandbox") return { kind: "sandbox" };
  if (hash === "negotiate") return { kind: "negotiate" };
  if (hash === "factory") return { kind: "factory" };
  const learnMatch = hash.match(/^learn\/(\d+)$/);
  if (learnMatch) {
    const level = Number(learnMatch[1]);
    if (level >= 1 && level <= TOTAL_LEVELS) {
      return { kind: "learn", level: level as LevelId };
    }
    return { kind: "learn", level: 1 };
  }
  // legacy "#arc" / "#play" / "#lab" / "#study" land in Sandbox
  if (["arc", "play", "lab", "study"].includes(hash)) {
    return { kind: "sandbox" };
  }
  return { kind: "home" };
}

function setHash(hash: string): void {
  if (typeof window === "undefined") return;
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  const goHome = useCallback(() => {
    setHash("#/home");
    setRoute({ kind: "home" });
  }, []);
  const goSandbox = useCallback(() => {
    setHash("#/sandbox");
    setRoute({ kind: "sandbox" });
  }, []);
  const goNegotiate = useCallback(() => {
    setHash("#/negotiate");
    setRoute({ kind: "negotiate" });
  }, []);
  const goFactory = useCallback(() => {
    setHash("#/factory");
    setRoute({ kind: "factory" });
  }, []);
  const goLearn = useCallback((level: number) => {
    const safeLevel = (Math.max(1, Math.min(TOTAL_LEVELS, level)) as LevelId);
    setHash(`#/learn/${safeLevel}`);
    setRoute({ kind: "learn", level: safeLevel });
  }, []);

  if (route.kind === "report") {
    return (
      <div className="app-shell report-shell">
        <main>
          <Suspense fallback={<div data-testid="report-loading">Loading report…</div>}>
            <ReportSurface />
          </Suspense>
        </main>
      </div>
    );
  }

  if (route.kind === "home") {
    return (
      <HomeSurface
        onStartPlaying={(level) => goLearn(level)}
        onOpenSandbox={goSandbox}
        onOpenNegotiate={goNegotiate}
        onOpenFactory={goFactory}
      />
    );
  }

  if (route.kind === "learn") {
    return (
      <LearnShell
        level={route.level}
        onNavigateLevel={(level) => goLearn(level)}
        onOpenHome={goHome}
        onOpenSandbox={goSandbox}
      />
    );
  }

  if (route.kind === "negotiate") {
    return <NegotiateSurface onOpenHome={goHome} />;
  }

  if (route.kind === "factory") {
    return (
      <Suspense fallback={<div data-testid="factory-loading">Loading factory console...</div>}>
        <FactoryConsole onOpenHome={goHome} />
      </Suspense>
    );
  }

  // sandbox
  return (
    <Suspense fallback={<div data-testid="sandbox-loading">Loading sandbox…</div>}>
      <SandboxShell />
    </Suspense>
  );
}

export { parseRoute };

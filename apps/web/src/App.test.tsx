import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App, { parseRoute } from "./App";
import { clearProgress } from "./state/learnProgress";

afterEach(() => {
  cleanup();
  clearProgress();
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/");
  }
});

function setLocation(hash: string, search: string = "") {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `/${search}${hash}`);
}

describe("App router", () => {
  it("parseRoute returns home for empty hash", () => {
    setLocation("");
    expect(parseRoute()).toEqual({ kind: "home" });
  });

  it("parseRoute returns learn at the requested level", () => {
    setLocation("#/learn/3");
    expect(parseRoute()).toEqual({ kind: "learn", level: 3 });
  });

  it("parseRoute clamps out-of-range learn levels to 1", () => {
    setLocation("#/learn/99");
    expect(parseRoute()).toEqual({ kind: "learn", level: 1 });
  });

  it("parseRoute returns sandbox for #/sandbox", () => {
    setLocation("#/sandbox");
    expect(parseRoute()).toEqual({ kind: "sandbox" });
  });

  it("parseRoute returns negotiate for #/negotiate", () => {
    setLocation("#/negotiate");
    expect(parseRoute()).toEqual({ kind: "negotiate" });
  });

  it('parseRoute treats legacy "#arc" / "#play" / "#lab" / "#study" as sandbox', () => {
    for (const legacy of ["#arc", "#play", "#lab", "#study"]) {
      setLocation(legacy);
      expect(parseRoute().kind).toBe("sandbox");
    }
  });

  it("parseRoute returns report when ?report=<id> is present", () => {
    setLocation("", "?report=run-abc");
    expect(parseRoute()).toEqual({ kind: "report" });
  });

  it("App renders HomeSurface at default route", () => {
    setLocation("");
    render(<App />);
    expect(screen.getByTestId("home-surface")).toBeTruthy();
  });

  // We deliberately don't render the full LearnShell or SandboxApp inside
  // this file. LearnShell + Level01 pull the full @lab/engine surface, and
  // SandboxApp pulls cytoscape on top of that. Mounting either twice in
  // the same vitest worker exhausted the jsdom worker's heap budget on
  // Windows. The dedicated Level01.test.tsx and SandboxApp.test.tsx files
  // cover their respective surfaces in isolation; the route assertions for
  // #/learn/N and #/sandbox are exercised via parseRoute() above.
});

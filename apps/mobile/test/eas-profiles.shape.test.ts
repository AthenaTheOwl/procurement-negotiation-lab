// eas-profiles.shape.test.ts — pin the three-profile shape from
// DEC-MOBREL-001 against accidental collapse. Reads apps/mobile/eas.json
// as plain JSON; no Expo runtime needed.
//
// Promoted from the 2026-W21 dream candidate
// `dreams/2026-W21/candidates/eval-001-eas-three-profile-shape-pin.md`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type EasProfile = {
  developmentClient?: boolean;
  distribution?: string;
  channel?: string;
  autoIncrement?: boolean;
  android?: {
    buildType?: string;
    gradleCommand?: string;
  };
  ios?: {
    simulator?: boolean;
  };
};

type EasConfig = {
  cli?: { version?: string };
  build?: Record<string, EasProfile>;
  submit?: Record<string, unknown>;
};

function loadEasConfig(): EasConfig {
  const path = resolve(__dirname, "..", "eas.json");
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as EasConfig;
}

describe("eas.json three-profile shape (DEC-MOBREL-001)", () => {
  const config = loadEasConfig();
  const build = config.build ?? {};

  it("declares exactly three build profiles named development, preview, production", () => {
    const profileNames = Object.keys(build).sort();
    expect(profileNames).toEqual(["development", "preview", "production"]);
  });

  it("development profile carries developmentClient: true", () => {
    const dev = build.development;
    expect(dev).toBeDefined();
    expect(dev?.developmentClient).toBe(true);
  });

  it("development profile emits a debug APK plus iOS simulator binary", () => {
    const dev = build.development;
    expect(dev?.android?.buildType).toBe("apk");
    expect(dev?.ios?.simulator).toBe(true);
  });

  it("preview profile carries distribution: internal", () => {
    const preview = build.preview;
    expect(preview).toBeDefined();
    expect(preview?.distribution).toBe("internal");
  });

  it("preview profile emits a release APK on a preview channel", () => {
    const preview = build.preview;
    expect(preview?.channel).toBe("preview");
    expect(preview?.android?.buildType).toBe("apk");
    expect(preview?.ios?.simulator).toBe(true);
  });

  it("production profile carries autoIncrement: true", () => {
    const prod = build.production;
    expect(prod).toBeDefined();
    expect(prod?.autoIncrement).toBe(true);
  });

  it("production profile emits an Android app bundle plus iOS device IPA", () => {
    const prod = build.production;
    expect(prod?.channel).toBe("production");
    expect(prod?.android?.buildType).toBe("app-bundle");
    expect(prod?.ios?.simulator).toBe(false);
  });

  it("only production carries the autoIncrement flag", () => {
    expect(build.development?.autoIncrement).toBeUndefined();
    expect(build.preview?.autoIncrement).toBeUndefined();
    expect(build.production?.autoIncrement).toBe(true);
  });

  it("each profile carries a channel matching its name", () => {
    expect(build.development?.channel).toBe("development");
    expect(build.preview?.channel).toBe("preview");
    expect(build.production?.channel).toBe("production");
  });
});

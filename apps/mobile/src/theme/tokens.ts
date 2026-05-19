/**
 * Tokens — the mobile mirror of packages/engine/assets/tokens.css.
 *
 * RN does not parse CSS custom properties, so the same design-token
 * values are exported as a plain TypeScript object. Keep this file in
 * sync with assets/tokens.css. Tests assert that every web token has a
 * matching mobile token by name.
 */

export const colors = {
  surplusGood: "#1bb676",
  surplusLost: "#d24a4a",
  walkawayBad: "#a31f1f",
  privacyCost: "#d3603a",
  neutralBg: "#f7f7f4",
  neutralBg2: "#ffffff",
  neutralFg: "#1c1c1f",
  neutralFgSoft: "#5b5b62",
  neutralLine: "#e3e3df",
  dealZone: "rgba(27, 182, 118, 0.1)",
  walkawayZone: "rgba(210, 74, 74, 0.1)",
  roleBuyer: "#3a78ff",
  roleSupplier: "#f4a85f",
  rolePackager: "#9b8cff",
  roleLogistics: "#1bb6c5",
  roleDistributor: "#c64bd5",
  roleCoordinator: "#6d54ff",
};

export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
};

export const type = {
  t1: 14,
  t2: 16,
  t3: 18,
  t4: 22,
  t5: 28,
  t6: 36,
};

export const radius = {
  tile: 12,
  card: 16,
  pill: 999,
};

export const motion = {
  quick: 120,
  mid: 240,
  slow: 360,
};

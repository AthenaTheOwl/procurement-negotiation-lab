import { colors, motion, radius, space, type } from "./tokens";

describe("design tokens (mobile)", () => {
  test("colors include all role accents", () => {
    expect(colors.roleBuyer).toBeDefined();
    expect(colors.roleSupplier).toBeDefined();
    expect(colors.rolePackager).toBeDefined();
    expect(colors.roleLogistics).toBeDefined();
    expect(colors.roleDistributor).toBeDefined();
    expect(colors.roleCoordinator).toBeDefined();
  });

  test("spacing scale is monotonically increasing", () => {
    const values = [space.s1, space.s2, space.s3, space.s4, space.s5, space.s6, space.s7];
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  test("type scale is monotonically increasing", () => {
    const values = [type.t1, type.t2, type.t3, type.t4, type.t5, type.t6];
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  test("motion exposes quick/mid/slow", () => {
    expect(motion.quick).toBeGreaterThan(0);
    expect(motion.mid).toBeGreaterThan(motion.quick);
    expect(motion.slow).toBeGreaterThan(motion.mid);
  });

  test("radius has tile/card/pill", () => {
    expect(radius.tile).toBeDefined();
    expect(radius.card).toBeDefined();
    expect(radius.pill).toBeDefined();
  });
});

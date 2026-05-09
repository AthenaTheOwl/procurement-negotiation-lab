import { describe, expect, it } from "vitest";
import { FormulaError, compileFormula } from "./formula";

describe("compileFormula", () => {
  it.each([
    ["2 + 3", {}, 5],
    ["10 - 4", {}, 6],
    ["q * 2", { q: 7 }, 14],
    ["9 / 3", {}, 3],
    ["10 % 4", {}, 2],
    ["2 ** 3", {}, 8],
    ["max(q, 0)", { q: -5 }, 0],
    ["min(q, 100)", { q: 250 }, 100],
    ["abs(-7)", {}, 7],
    ["sqrt(16)", {}, 4],
    ["log(q)", { q: Math.E }, 1],
    ["exp(1)", {}, Math.E],
    ["clip(q, 0, 10)", { q: 25 }, 10],
    ["clip(q, 0, 10)", { q: -3 }, 0],
    ["100 * min(q, demand) - unit_price * q", { q: 50, demand: 60, unit_price: 30 }, 3500],
    ["q > 0 ? q : 0", { q: 7 }, 7],
    ["q > 0 ? q : 0", { q: -3 }, 0],
    ["+q", { q: 4 }, 4],
    ["-q", { q: 4 }, -4],
    ["!q", { q: 0 }, 1],
    ["flag + 1", { flag: true }, 2],
    ["q > 0 && demand > 0", { q: 1, demand: 1 }, 1],
    ["q > 0 && demand > 0", { q: 0, demand: 1 }, 0],
    ["q > 0 || demand > 0", { q: 0, demand: 1 }, 1],
    ["q > 0 || demand > 0", { q: 0, demand: 0 }, 0],
  ])("evaluates %s", (expr, namespace, expected) => {
    expect(compileFormula(expr).evaluate(namespace)).toBeCloseTo(expected);
  });

  it.each([
    ["1 < 2", 1],
    ["1 <= 1", 1],
    ["2 > 1", 1],
    ["2 >= 2", 1],
    ["2 == 2", 1],
    ["2 === 2", 1],
    ["2 != 3", 1],
    ["2 !== 3", 1],
    ["2 < 1", 0],
  ])("evaluates comparison %s", (expr, expected) => {
    expect(compileFormula(expr).evaluate({})).toBe(expected);
  });

  it("extracts free variables", () => {
    const compiled = compileFormula("a * x + b * y - max(c, 0)");
    expect([...compiled.variables()].sort()).toEqual(["a", "b", "c", "x", "y"]);
  });

  it.each([
    "__import__('os')",
    "({}).constructor",
    "[1, 2, 3].map(x => x)",
    "(q) => q + 1",
    "q = 5",
    "os.system('rm')",
    "Math.max(q, 0)",
    "eval('1+1')",
    "input()",
    "new Function('return 1')",
    "`template ${q}`",
    "[1, 2, 3]",
    "({ a: 1 })",
  ])("rejects unsafe formula %s", (expr) => {
    expect(() => compileFormula(expr)).toThrow(FormulaError);
  });

  it("rejects non-string and empty formulas", () => {
    expect(() => compileFormula(123 as unknown as string)).toThrow(/string/);
    expect(() => compileFormula("   ")).toThrow(/empty/);
  });

  it("rejects unexpected trailing input", () => {
    expect(() => compileFormula("1 2")).toThrow(/trailing input/);
  });

  it("rejects unknown variables at evaluate time", () => {
    const compiled = compileFormula("q + xyz");
    expect(() => compiled.evaluate({ q: 1 })).toThrow(/unknown variable/);
  });

  it("rejects unknown variables at compile time when an allowlist is provided", () => {
    expect(() => compileFormula("q + xyz", ["q"])).toThrow(/unknown variable/);
  });

  it("rejects oversized formulas", () => {
    expect(() => compileFormula(`${"q + ".repeat(1000)}1`)).toThrow(/exceeds/);
  });

  it("rejects formulas with too many AST nodes", () => {
    expect(() => compileFormula(`1${" + 1".repeat(200)}`)).toThrow(/too complex/);
  });

  it("rejects log of non-positive values", () => {
    const compiled = compileFormula("log(q)");
    expect(() => compiled.evaluate({ q: 0 })).toThrow(/log/);
    expect(() => compiled.evaluate({ q: -1 })).toThrow(/log/);
  });

  it("rejects inverted clip bounds", () => {
    const compiled = compileFormula("clip(q, 10, 0)");
    expect(() => compiled.evaluate({ q: 5 })).toThrow(/clip/);
  });

  it("rejects sqrt of negative values", () => {
    const compiled = compileFormula("sqrt(q)");
    expect(() => compiled.evaluate({ q: -1 })).toThrow(/sqrt/);
  });

  it("caps pow exponents", () => {
    const compiled = compileFormula("pow(2, exponent)");
    expect(() => compiled.evaluate({ exponent: 1000 })).toThrow(/exponent/);
  });

  it("uses the same exponent cap for the ** operator", () => {
    const compiled = compileFormula("2 ** exponent");
    expect(() => compiled.evaluate({ exponent: 1000 })).toThrow(/exponent/);
  });

  it("rejects division and modulo by zero", () => {
    expect(() => compileFormula("q / d").evaluate({ q: 1, d: 0 })).toThrow(/division by zero/);
    expect(() => compileFormula("q % d").evaluate({ q: 1, d: 0 })).toThrow(/division by zero/);
  });

  it("rejects non-finite results", () => {
    const compiled = compileFormula("exp(1000)");
    expect(() => compiled.evaluate({})).toThrow(/not finite/);
  });

  it("rejects non-finite variables", () => {
    const compiled = compileFormula("q + 1");
    expect(() => compiled.evaluate({ q: Number.POSITIVE_INFINITY })).toThrow(/not finite/);
  });

  it("rejects referencing a whitelisted function as a value", () => {
    const compiled = compileFormula("min");
    expect(() => compiled.evaluate({})).toThrow(/cannot reference function/);
  });
});

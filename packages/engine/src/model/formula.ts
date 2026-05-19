import { parseExpressionAt } from "acorn";

const MAX_EXPR_LEN = 2000;
const MAX_AST_NODES = 200;
const MAX_CALL_DEPTH = 5;

type Namespace = Record<string, number | boolean>;

interface FormulaNode {
  type: string;
  end?: number;
  [key: string]: unknown;
}

type SafeFunction = (...args: number[]) => number;

const allowedFunctions: Record<string, SafeFunction> = {
  min: (...args: number[]) => Math.min(...args),
  max: (...args: number[]) => Math.max(...args),
  abs: (value: number) => Math.abs(value),
  sqrt: (value: number) => {
    if (value < 0) {
      throw new FormulaError(`sqrt: argument must be >= 0 (got ${value})`);
    }
    return Math.sqrt(value);
  },
  log: (value: number) => {
    if (value <= 0) {
      throw new FormulaError(`log: argument must be > 0 (got ${value})`);
    }
    return Math.log(value);
  },
  exp: (value: number) => Math.exp(value),
  clip: (value: number, lo: number, hi: number) => {
    if (lo > hi) {
      throw new FormulaError(`clip: lo (${lo}) must be <= hi (${hi})`);
    }
    return Math.max(lo, Math.min(hi, value));
  },
  pow: safePow,
};

const allowedBinaryOps = new Set(["+", "-", "*", "/", "%", "**"]);
const allowedCompareOps = new Set(["<", "<=", ">", ">=", "==", "===", "!=", "!=="]);
const allowedUnaryOps = new Set(["+", "-", "!"]);
const bannedNodeTypes = new Set([
  "MemberExpression",
  "ImportExpression",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "NewExpression",
  "ClassExpression",
  "ObjectExpression",
  "ArrayExpression",
  "SequenceExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "AwaitExpression",
  "YieldExpression",
  "TaggedTemplateExpression",
  "TemplateLiteral",
]);

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

export interface CompiledFormula {
  source: string;
  variables: () => Set<string>;
  evaluate: (namespace: Namespace) => number;
}

export function compileFormula(source: string, allowedVars?: Iterable<string>): CompiledFormula {
  if (typeof source !== "string") {
    throw new FormulaError(`formula must be a string, got ${typeof source}`);
  }

  const trimmed = source.trim();
  if (!trimmed) {
    throw new FormulaError("formula is empty");
  }
  if (trimmed.length > MAX_EXPR_LEN) {
    throw new FormulaError(`formula exceeds ${MAX_EXPR_LEN} chars (got ${trimmed.length})`);
  }

  let root: FormulaNode;
  try {
    root = parseExpressionAt(trimmed, 0, { ecmaVersion: "latest" }) as unknown as FormulaNode;
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : String(error);
    throw new FormulaError(`syntax error: ${message}`);
  }

  const parsedEnd = root.end ?? 0;
  if (trimmed.slice(parsedEnd).trim().length > 0) {
    throw new FormulaError("syntax error: unexpected trailing input");
  }

  const freeVars = new Set<string>();
  const allowedVarSet = allowedVars ? new Set(allowedVars) : undefined;
  validate(root, freeVars, { count: 0 });

  if (allowedVarSet) {
    const unknown = [...freeVars].filter((name) => !allowedVarSet.has(name));
    if (unknown.length > 0) {
      throw new FormulaError(
        `unknown variable(s): ${unknown.sort().join(", ")}. Allowed: ${[...allowedVarSet].sort().join(", ")}`,
      );
    }
  }

  return {
    source: trimmed,
    variables: () => new Set(freeVars),
    evaluate: (namespace: Namespace) => evaluate(root, namespace, 0),
  };
}

function validate(node: FormulaNode, freeVars: Set<string>, state: { count: number }) {
  state.count += 1;
  if (state.count > MAX_AST_NODES) {
    throw new FormulaError(`formula too complex (${state.count} AST nodes; max ${MAX_AST_NODES})`);
  }

  if (bannedNodeTypes.has(node.type)) {
    throw new FormulaError(`node type ${node.type} is not allowed in formulas`);
  }

  switch (node.type) {
    case "Literal": {
      const value = node.value;
      if (typeof value !== "number" && typeof value !== "boolean") {
        throw new FormulaError(`constant of type ${typeof value} not allowed`);
      }
      return;
    }
    case "Identifier": {
      const name = readIdentifier(node);
      validateName(name);
      if (!allowedFunctions[name]) {
        freeVars.add(name);
      }
      return;
    }
    case "BinaryExpression": {
      const operator = readString(node, "operator");
      if (!allowedBinaryOps.has(operator) && !allowedCompareOps.has(operator)) {
        throw new FormulaError(`binary op ${operator} not allowed`);
      }
      validate(readNode(node, "left"), freeVars, state);
      validate(readNode(node, "right"), freeVars, state);
      return;
    }
    case "UnaryExpression": {
      const operator = readString(node, "operator");
      if (!allowedUnaryOps.has(operator)) {
        throw new FormulaError(`unary op ${operator} not allowed`);
      }
      validate(readNode(node, "argument"), freeVars, state);
      return;
    }
    case "LogicalExpression": {
      const operator = readString(node, "operator");
      if (operator !== "&&" && operator !== "||") {
        throw new FormulaError(`logical op ${operator} not allowed`);
      }
      validate(readNode(node, "left"), freeVars, state);
      validate(readNode(node, "right"), freeVars, state);
      return;
    }
    case "ConditionalExpression": {
      validate(readNode(node, "test"), freeVars, state);
      validate(readNode(node, "consequent"), freeVars, state);
      validate(readNode(node, "alternate"), freeVars, state);
      return;
    }
    case "CallExpression": {
      const callee = readNode(node, "callee");
      if (callee.type !== "Identifier") {
        throw new FormulaError("only direct calls to whitelisted functions allowed");
      }
      const functionName = readIdentifier(callee);
      validateName(functionName);
      if (!allowedFunctions[functionName]) {
        throw new FormulaError(`function ${functionName} is not allowed`);
      }
      for (const arg of readNodeArray(node, "arguments")) {
        validate(arg, freeVars, state);
      }
      return;
    }
    default:
      throw new FormulaError(`node type ${node.type} is not allowed in formulas`);
  }
}

function evaluate(node: FormulaNode, namespace: Namespace, depth: number): number {
  if (depth > MAX_CALL_DEPTH) {
    throw new FormulaError(`call depth ${depth} exceeds max ${MAX_CALL_DEPTH}`);
  }

  switch (node.type) {
    case "Literal": {
      const value = node.value;
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      if (typeof value === "number") {
        return ensureFinite(value);
      }
      throw new FormulaError(`constant of type ${typeof value} not allowed`);
    }
    case "Identifier": {
      const name = readIdentifier(node);
      if (allowedFunctions[name]) {
        throw new FormulaError(`cannot reference function ${name} as a value`);
      }
      if (!(name in namespace)) {
        throw new FormulaError(`unknown variable: ${name}`);
      }
      return numeric(namespace[name], name);
    }
    case "BinaryExpression":
      return evaluateBinary(node, namespace, depth);
    case "UnaryExpression":
      return evaluateUnary(node, namespace, depth);
    case "LogicalExpression":
      return evaluateLogical(node, namespace, depth);
    case "ConditionalExpression":
      return truthy(evaluate(readNode(node, "test"), namespace, depth))
        ? evaluate(readNode(node, "consequent"), namespace, depth)
        : evaluate(readNode(node, "alternate"), namespace, depth);
    case "CallExpression":
      return evaluateCall(node, namespace, depth);
    default:
      throw new FormulaError(`node type ${node.type} not allowed`);
  }
}

function evaluateBinary(node: FormulaNode, namespace: Namespace, depth: number): number {
  const left = evaluate(readNode(node, "left"), namespace, depth);
  const right = evaluate(readNode(node, "right"), namespace, depth);
  const operator = readString(node, "operator");

  if (allowedCompareOps.has(operator)) {
    return compare(left, right, operator) ? 1 : 0;
  }

  switch (operator) {
    case "+":
      return ensureFinite(left + right);
    case "-":
      return ensureFinite(left - right);
    case "*":
      return ensureFinite(left * right);
    case "/":
      if (right === 0) {
        throw new FormulaError("division by zero");
      }
      return ensureFinite(left / right);
    case "%":
      if (right === 0) {
        throw new FormulaError("division by zero");
      }
      return ensureFinite(left % right);
    case "**":
      return safePow(left, right);
    default:
      throw new FormulaError(`binary op ${operator} not allowed`);
  }
}

function evaluateUnary(node: FormulaNode, namespace: Namespace, depth: number): number {
  const value = evaluate(readNode(node, "argument"), namespace, depth);
  const operator = readString(node, "operator");
  if (operator === "+") {
    return value;
  }
  if (operator === "-") {
    return -value;
  }
  if (operator === "!") {
    return truthy(value) ? 0 : 1;
  }
  throw new FormulaError(`unary op ${operator} not allowed`);
}

function evaluateLogical(node: FormulaNode, namespace: Namespace, depth: number): number {
  const left = evaluate(readNode(node, "left"), namespace, depth);
  const operator = readString(node, "operator");
  if (operator === "&&") {
    return truthy(left) ? evaluate(readNode(node, "right"), namespace, depth) : 0;
  }
  if (operator === "||") {
    return truthy(left) ? 1 : evaluate(readNode(node, "right"), namespace, depth);
  }
  throw new FormulaError(`logical op ${operator} not allowed`);
}

function evaluateCall(node: FormulaNode, namespace: Namespace, depth: number): number {
  const callee = readNode(node, "callee");
  /* v8 ignore next 3 -- validation rejects this before a compiled formula can evaluate. */
  if (callee.type !== "Identifier") {
    throw new FormulaError("only direct calls to whitelisted functions allowed");
  }
  const functionName = readIdentifier(callee);
  const fn = allowedFunctions[functionName];
  /* v8 ignore next 3 -- validation rejects non-whitelisted functions before evaluation. */
  if (!fn) {
    throw new FormulaError(`function ${functionName} is not allowed`);
  }
  const args = readNodeArray(node, "arguments").map((arg) => evaluate(arg, namespace, depth + 1));
  return ensureFinite(fn(...args));
}

function compare(left: number, right: number, operator: string): boolean {
  switch (operator) {
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "==":
    case "===":
      return left === right;
    case "!=":
    case "!==":
      return left !== right;
    /* v8 ignore next 2 -- validation only permits the compare operators above. */
    default:
      throw new FormulaError(`compare op ${operator} not allowed`);
  }
}

function safePow(base: number, exponent: number): number {
  if (Math.abs(exponent) > 10) {
    throw new FormulaError(`pow: exponent ${exponent} exceeds limit (|exp| <= 10)`);
  }
  return ensureFinite(Math.pow(base, exponent));
}

function validateName(name: string) {
  if (name.startsWith("_") || name.includes("__")) {
    throw new FormulaError(`name ${name} is not allowed (private/dunder)`);
  }
}

function readIdentifier(node: FormulaNode): string {
  return readString(node, "name");
}

function readString(node: FormulaNode, key: string): string {
  const value = node[key];
  /* v8 ignore next 3 -- acorn supplies these fields for node types we accept. */
  if (typeof value !== "string") {
    throw new FormulaError(`malformed AST: ${node.type}.${key} is missing`);
  }
  return value;
}

function readNode(node: FormulaNode, key: string): FormulaNode {
  const value = node[key];
  /* v8 ignore next 3 -- acorn supplies these fields for node types we accept. */
  if (!isFormulaNode(value)) {
    throw new FormulaError(`malformed AST: ${node.type}.${key} is not a node`);
  }
  return value;
}

function readNodeArray(node: FormulaNode, key: string): FormulaNode[] {
  const value = node[key];
  /* v8 ignore next 3 -- acorn supplies these fields for node types we accept. */
  if (!Array.isArray(value) || !value.every(isFormulaNode)) {
    throw new FormulaError(`malformed AST: ${node.type}.${key} is not a node list`);
  }
  return value;
}

function isFormulaNode(value: unknown): value is FormulaNode {
  return typeof value === "object" && value !== null && typeof (value as FormulaNode).type === "string";
}

function numeric(value: number | boolean, name: string): number {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (!Number.isFinite(value)) {
    throw new FormulaError(`variable ${name} is not finite`);
  }
  return value;
}

function ensureFinite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new FormulaError("formula result is not finite");
  }
  return value;
}

function truthy(value: number): boolean {
  return value !== 0;
}

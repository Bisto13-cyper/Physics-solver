"use strict";

const ELEMENTARY_CHARGE = 1.6e-19;

const GROUPS = [
  { id: "electric", title: "Electricity" },
  { id: "material", title: "Material & Dimensions" },
  { id: "motion",   title: "Periodic Motion" },
];

const VARIABLES = [
  { key: "Q",     symbol: "Q",  unit: "C",     group: "electric" },
  { key: "N",     symbol: "N",  unit: "",      group: "electric" },
  { key: "I",     symbol: "I",  unit: "A",     group: "electric" },
  { key: "V",     symbol: "V",  unit: "V",     group: "electric" },
  { key: "R",     symbol: "R",  unit: "Ω",     group: "electric" },
  { key: "Pw",    symbol: "Pw", unit: "W",     group: "electric" },
  { key: "W",     symbol: "W",  unit: "J",     group: "electric" },
  { key: "t",     symbol: "t",  unit: "s",     group: "electric" },

  { key: "rho_e", symbol: "ρₑ", unit: "Ω·m",   group: "material" },
  { key: "sigma", symbol: "σ",  unit: "S/m",   group: "material" },
  { key: "L",     symbol: "L",  unit: "m",     group: "material" },
  { key: "A",     symbol: "A",  unit: "m²",    group: "material" },
  { key: "r",     symbol: "r",  unit: "m",     group: "material" },
  { key: "Vol",   symbol: "Vol",unit: "m³",    group: "material" },
  { key: "m",     symbol: "m",  unit: "kg",    group: "material" },
  { key: "rho",   symbol: "ρ",  unit: "kg/m³", group: "material" },

  { key: "f",     symbol: "f",  unit: "Hz",    group: "motion" },
  { key: "T",     symbol: "T",  unit: "s",     group: "motion" },
  { key: "v_vel", symbol: "v",  unit: "m/s",   group: "motion" },
];

const SYMBOL = Object.fromEntries(VARIABLES.map(v => [v.key, v.symbol]));
const UNIT   = Object.fromEntries(VARIABLES.map(v => [v.key, v.unit]));

function fmt(v, sig = 6) {
  if (v === 0) return "0";
  if (!Number.isFinite(v)) return String(v);
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e < -4 || e >= sig) {
    let s = v.toExponential(sig - 1);
    s = s.replace(/0+(e[+-]?\d+)$/, "$1").replace(/\.(e[+-]?\d+)$/, "$1");
    s = s.replace(/e([+-])(\d)$/, "e$10$2");
    return s;
  } else {
    const decimals = Math.max(0, sig - 1 - e);
    let s = v.toFixed(decimals);
    if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }
}

function isClose(a, b, relTol, absTol) {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol);
}

function arg(v) {
  const s = fmt(v);
  return v < 0 ? `(${s})` : s;
}

class Physics {
  static FIELDS = VARIABLES.map(v => v.key);
  static ELEMENTARY_CHARGE = ELEMENTARY_CHARGE;
  static POSITIVE = new Set(["R","t","rho_e","sigma","A","L","Vol","m","rho","f","T","r"]);

  constructor(kwargs = {}) {
    this.reset();
    this.insert(kwargs);
  }

  reset() {
    for (const f of Physics.FIELDS) this[f] = null;
  }

  insert(kwargs) {
    for (const [key, value] of Object.entries(kwargs)) {
      if (!Physics.FIELDS.includes(key))
        throw new Error(`Unknown variable '${key}'.`);
      if (value !== null && value !== undefined) {
        if (!Physics._isValid(value))
          throw new Error(`Invalid value for ${SYMBOL[key]}: ${JSON.stringify(value)}`);
        if (!Physics.accepts(key, value))
          throw new Error(`${SYMBOL[key]} must be greater than zero.`);
        this[key] = value;
      }
    }
  }

  static _isValid(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  static accepts(field, v) {
    if (!Physics._isValid(v)) return false;
    if (Physics.POSITIVE.has(field) && v <= 0) return false;
    return true;
  }

  known() {
    const out = {};
    for (const f of Physics.FIELDS) if (this[f] !== null) out[f] = this[f];
    return out;
  }

  formatted() {
    const out = {};
    for (const [f, v] of Object.entries(this.known())) out[f] = fmt(v);
    return out;
  }
}

class Equation {
  constructor(target, sources, fn, expr, { magnitude = false } = {}) {
    this.target    = target;
    this.sources   = sources;
    this.fn        = fn;
    this.expr      = expr;
    this.magnitude = magnitude;
    if (!Physics.FIELDS.includes(target))
      throw new Error(`Unknown target: ${target}`);
    for (const s of sources)
      if (!Physics.FIELDS.includes(s))
        throw new Error(`Unknown source: ${s}`);
  }

  _inputs(physics) {
    const inputs = {};
    for (const src of this.sources) {
      const v = physics[src];
      if (v === null || v === undefined) return null;
      inputs[src] = v;
    }
    return inputs;
  }

  _compute(inputs) {
    try {
      const args = this.sources.map(s => inputs[s]);
      const result = this.fn(...args);
      if (typeof result !== "number" || !Number.isFinite(result)) return null;
      return result;
    } catch {
      return null;
    }
  }

  tryApply(physics) {
    if (physics[this.target] !== null && physics[this.target] !== undefined) return null;
    const inputs = this._inputs(physics);
    if (inputs === null) return null;
    const result = this._compute(inputs);
    if (result === null || !Physics.accepts(this.target, result)) return null;
    physics[this.target] = result;
    return inputs;
  }

  evaluate(physics) {
    const inputs = this._inputs(physics);
    return inputs === null ? null : this._compute(inputs);
  }

  symbolic() {
    const rhs = this.expr.replace(/\{(\w+)\}/g, (_, k) => SYMBOL[k]);
    return `${SYMBOL[this.target]} = ${rhs}`;
  }
}

class PhysicsCalculator {
  static MAX_ITERATIONS = 64;

  constructor(physics) {
    this.p         = physics;
    this.equations = PhysicsCalculator.buildEquations();
    this.given     = new Set(Object.keys(physics.known()));
    this.trace     = {};
  }

  solve() {
    for (let i = 0; i < PhysicsCalculator.MAX_ITERATIONS; i++) {
      let changed = false;
      for (const eq of this.equations) {
        const inputs = eq.tryApply(this.p);
        if (inputs !== null) {
          this.trace[eq.target] = { eq, inputs };
          changed = true;
        }
      }
      if (!changed) break;
    }
    return this.p;
  }

  checkConsistency(relTol = 1e-6, absTol = 1e-9) {
    const issues = [];
    for (const eq of this.equations) {
      const stored = this.p[eq.target];
      if (stored === null || stored === undefined) continue;
      const expected = eq.evaluate(this.p);
      if (expected === null) continue;
      const [a, b] = eq.magnitude
        ? [Math.abs(stored), Math.abs(expected)]
        : [stored, expected];
      if (!isClose(a, b, relTol, absTol)) {
        issues.push({
          key: eq.target,
          symbol: SYMBOL[eq.target],
          unit: UNIT[eq.target],
          formula: eq.symbolic(),
          stored: fmt(stored),
          expected: fmt(expected),
        });
      }
    }
    return issues;
  }

  static _brief(issues) {
    const seen = new Set(), out = [];
    for (const it of issues) {
      if (!seen.has(it.key)) { seen.add(it.key); out.push(it); }
    }
    return out;
  }

  explain(target) {
    const steps = [], seen = new Set();
    const walk = (field) => {
      if (seen.has(field) || !(field in this.trace)) return;
      seen.add(field);
      const { eq, inputs } = this.trace[field];
      for (const s of eq.sources) walk(s);
      const value = this.p[field];
      steps.push({
        key: field,
        formula: eq.symbolic(),
        substituted: `${SYMBOL[field]} = ` +
          eq.expr.replace(/\{(\w+)\}/g, (_, k) => arg(inputs[k])),
        display: fmt(value),
        unit: UNIT[field],
      });
    };
    walk(target);
    return steps;
  }

  hintsFor(target, limit = 3) {
    const hints = [];
    for (const eq of this.equations) {
      if (eq.target !== target) continue;
      const missing = eq.sources.filter(s =>
        this.p[s] === null || this.p[s] === undefined);
      hints.push({ formula: eq.symbolic(), missing });
    }
    hints.sort((a, b) => a.missing.length - b.missing.length);
    return hints.slice(0, limit);
  }

  _entry(key) {
    const v = this.p[key];
    return { key, symbol: SYMBOL[key], value: v, display: fmt(v), unit: UNIT[key] };
  }

  reportTarget(target, relTol = 1e-6) {
    this.solve();
    const conflicts = PhysicsCalculator._brief(this.checkConsistency(relTol));
    if (this.p[target] === null || this.p[target] === undefined) {
      return {
        ok: false, target,
        message: "Insufficient data",
        hints: this.hintsFor(target),
        conflicts,
      };
    }
    return {
      ok: true, target,
      ...this._entry(target),
      steps: this.explain(target),
      conflicts,
    };
  }

  reportAll(relTol = 1e-6) {
    this.solve();
    const conflicts = PhysicsCalculator._brief(this.checkConsistency(relTol));
    const derived = [];
    for (const key of Physics.FIELDS) {
      if (this.given.has(key)) continue;
      if (this.p[key] === null || this.p[key] === undefined) continue;
      derived.push({ ...this._entry(key), steps: this.explain(key) });
    }
    const given = [];
    for (const k of Physics.FIELDS) if (this.given.has(k)) given.push(this._entry(k));
    const out = { ok: derived.length > 0, given, derived, conflicts };
    if (derived.length === 0) out.message = "Insufficient data";
    return out;
  }

  static buildEquations() {
    const E  = (t, s, fn, expr, o) => new Equation(t, s, fn, expr, o);
    const e  = ELEMENTARY_CHARGE;
    const pi = Math.PI;

    return [
      E("Q", ["I","t"],           (I,t)     => I * t,          "{I} × {t}"),
      E("Q", ["W","V"],           (W,V)     => W / V,          "{W} / {V}"),
      E("Q", ["Pw","t","V"],      (Pw,t,V)  => Pw * t / V,     "({Pw} × {t}) / {V}"),
      E("Q", ["N"],               (N)       => N * e,          "{N} × e"),

      E("N", ["Q"],               (Q)       => Q / e,          "{Q} / e"),

      E("I", ["Q","t"],           (Q,t)     => Q / t,          "{Q} / {t}"),
      E("I", ["V","R"],           (V,R)     => V / R,          "{V} / {R}"),
      E("I", ["Pw","V"],          (Pw,V)    => Pw / V,         "{Pw} / {V}"),
      E("I", ["Pw","R"],          (Pw,R)    => Math.sqrt(Pw / R), "√({Pw} / {R})", { magnitude: true }),
      E("I", ["Q","f"],           (Q,f)     => Q * f,          "{Q} × {f}"),

      E("t", ["Q","I"],           (Q,I)     => Q / I,          "{Q} / {I}"),
      E("t", ["W","Pw"],          (W,Pw)    => W / Pw,         "{W} / {Pw}"),

      E("V", ["I","R"],           (I,R)     => I * R,          "{I} × {R}"),
      E("V", ["W","Q"],           (W,Q)     => W / Q,          "{W} / {Q}"),
      E("V", ["Pw","I"],          (Pw,I)    => Pw / I,         "{Pw} / {I}"),
      E("V", ["Pw","R"],          (Pw,R)    => Math.sqrt(Pw * R), "√({Pw} × {R})", { magnitude: true }),

      E("R", ["V","I"],           (V,I)     => V / I,          "{V} / {I}"),
      E("R", ["Pw","I"],          (Pw,I)    => Pw / (I ** 2),  "{Pw} / {I}²"),
      E("R", ["V","Pw"],          (V,Pw)    => (V ** 2) / Pw,  "{V}² / {Pw}"),
      E("R", ["rho_e","L","A"],   (rho_e,L,A) => (rho_e * L) / A, "({rho_e} × {L}) / {A}"),
      E("R", ["sigma","L","A"],   (sigma,L,A) => L / (A * sigma), "{L} / ({A} × {sigma})"),

      E("Pw", ["W","t"],          (W,t)     => W / t,          "{W} / {t}"),
      E("Pw", ["V","I"],          (V,I)     => V * I,          "{V} × {I}"),
      E("Pw", ["I","R"],          (I,R)     => (I ** 2) * R,   "{I}² × {R}"),
      E("Pw", ["V","R"],          (V,R)     => (V ** 2) / R,   "{V}² / {R}"),

      E("W", ["Pw","t"],          (Pw,t)    => Pw * t,         "{Pw} × {t}"),
      E("W", ["Q","V"],           (Q,V)     => Q * V,          "{Q} × {V}"),

      E("rho_e", ["R","A","L"],   (R,A,L)   => (R * A) / L,    "({R} × {A}) / {L}"),
      E("rho_e", ["sigma"],       (sigma)   => 1 / sigma,      "1 / {sigma}"),
      E("sigma", ["R","L","A"],   (R,L,A)   => L / (R * A),    "{L} / ({R} × {A})"),
      E("sigma", ["rho_e"],       (rho_e)   => 1 / rho_e,      "1 / {rho_e}"),

      E("L", ["R","A","rho_e"],   (R,A,rho_e) => (R * A) / rho_e, "({R} × {A}) / {rho_e}"),
      E("A", ["rho_e","L","R"],   (rho_e,L,R) => (rho_e * L) / R, "({rho_e} × {L}) / {R}"),

      E("L", ["R","sigma","A"],   (R,sigma,A) => R * sigma * A, "{R} × {sigma} × {A}"),
      E("A", ["L","R","sigma"],   (L,R,sigma) => L / (R * sigma), "{L} / ({R} × {sigma})"),

      E("Vol", ["A","L"],         (A,L)     => A * L,          "{A} × {L}"),
      E("A",   ["Vol","L"],       (Vol,L)   => Vol / L,        "{Vol} / {L}"),
      E("L",   ["Vol","A"],       (Vol,A)   => Vol / A,        "{Vol} / {A}"),
      E("m",   ["rho","Vol"],     (rho,Vol) => rho * Vol,      "{rho} × {Vol}"),
      E("rho", ["m","Vol"],       (m,Vol)   => m / Vol,        "{m} / {Vol}"),
      E("Vol", ["m","rho"],       (m,rho)   => m / rho,        "{m} / {rho}"),

      E("A", ["r"],               (r)       => pi * r ** 2,    "π × {r}²"),
      E("r", ["A"],               (A)       => Math.sqrt(A / pi), "√({A} / π)"),

      E("f", ["T"],               (T)       => 1 / T,          "1 / {T}"),
      E("T", ["f"],               (f)       => 1 / f,          "1 / {f}"),
      E("T", ["r","v_vel"],       (r,v_vel) => (2 * pi * r) / v_vel, "(2π × {r}) / {v_vel}"),
      E("v_vel", ["r","T"],       (r,T)     => (2 * pi * r) / T, "(2π × {r}) / {T}"),
      E("r", ["v_vel","T"],       (v_vel,T) => (v_vel * T) / (2 * pi), "({v_vel} × {T}) / 2π"),
    ];
  }
}

function getMeta() {
  return { groups: GROUPS, variables: VARIABLES };
}

function makeCalc(values, drop = null) {
  const clean = {};
  for (const [k, v] of Object.entries(values)) {
    if (k === drop) continue;
    clean[k] = v;
  }
  const unknown = Object.keys(clean).filter(k => !Physics.FIELDS.includes(k));
  if (unknown.length) throw new Error(`Unknown variables: ${unknown.join(", ")}`);
  return new PhysicsCalculator(new Physics(clean));
}

function handleCalculate(target, values) {
  if (!Physics.FIELDS.includes(target))
    throw new Error(`Variable '${target}' not found.`);
  const calc = makeCalc(values, target);
  return calc.reportTarget(target, 1e-2);
}

function handleSolve(values) {
  const calc = makeCalc(values);
  return calc.reportAll(1e-2);
}
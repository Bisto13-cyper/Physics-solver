import inspect
import math

ELEMENTARY_CHARGE = 1.6e-19

GROUPS = [
    {"id": "electric", "title": "Electricity"},
    {"id": "material", "title": "Material & Dimensions"},
    {"id": "motion",   "title": "Periodic Motion"},
]

VARIABLES = [
    {"key": "Q",     "symbol": "Q",  "unit": "C",     "group": "electric"},
    {"key": "N",     "symbol": "N",  "unit": "",      "group": "electric"},
    {"key": "I",     "symbol": "I",  "unit": "A",     "group": "electric"},
    {"key": "V",     "symbol": "V",  "unit": "V",     "group": "electric"},
    {"key": "R",     "symbol": "R",  "unit": "Ω",     "group": "electric"},
    {"key": "Pw",    "symbol": "Pw", "unit": "W",     "group": "electric"},
    {"key": "W",     "symbol": "W",  "unit": "J",     "group": "electric"},
    {"key": "t",     "symbol": "t",  "unit": "s",     "group": "electric"},

    {"key": "rho_e", "symbol": "ρₑ", "unit": "Ω·m",   "group": "material"},
    {"key": "sigma", "symbol": "σ",  "unit": "S/m",   "group": "material"},
    {"key": "L",     "symbol": "L",  "unit": "m",     "group": "material"},
    {"key": "A",     "symbol": "A",  "unit": "m²",    "group": "material"},
    {"key": "r",     "symbol": "r",  "unit": "m",     "group": "material"},
    {"key": "Vol",   "symbol": "Vol","unit": "m³",    "group": "material"},
    {"key": "m",     "symbol": "m",  "unit": "kg",    "group": "material"},
    {"key": "rho",   "symbol": "ρ",  "unit": "kg/m³", "group": "material"},

    {"key": "f",     "symbol": "f",  "unit": "Hz",    "group": "motion"},
    {"key": "T",     "symbol": "T",  "unit": "s",     "group": "motion"},
    {"key": "v_vel", "symbol": "v",  "unit": "m/s",   "group": "motion"},
]

SYMBOL = {v["key"]: v["symbol"] for v in VARIABLES}
UNIT = {v["key"]: v["unit"] for v in VARIABLES}


def fmt(v, sig: int = 6) -> str:
    if v == 0:
        return "0"
    return f"{v:.{sig}g}"


class Physics:
    FIELDS = tuple(v["key"] for v in VARIABLES)
    ELEMENTARY_CHARGE = ELEMENTARY_CHARGE

    POSITIVE = frozenset({
        "R", "t", "rho_e", "sigma", "A", "L", "Vol", "m", "rho", "f", "T", "r",
    })

    def __init__(self, **kwargs):
        self.reset()
        self.insert(**kwargs)

    def reset(self):
        for f in self.FIELDS:
            setattr(self, f, None)

    def insert(self, **kwargs):
        for key, value in kwargs.items():
            if key not in self.FIELDS:
                raise AttributeError(f"Unknown variable '{key}'.")
            if value is not None:
                if not self._is_valid(value):
                    raise ValueError(f"Invalid value for {SYMBOL[key]}: {value!r}")
                if not self.accepts(key, value):
                    raise ValueError(f"{SYMBOL[key]} must be greater than zero.")
            setattr(self, key, value)

    @staticmethod
    def _is_valid(v) -> bool:
        return (isinstance(v, (int, float))
                and not isinstance(v, bool)
                and math.isfinite(v))

    @classmethod
    def accepts(cls, field, v) -> bool:
        if not cls._is_valid(v):
            return False
        if field in cls.POSITIVE and v <= 0:
            return False
        return True

    def known(self) -> dict:
        return {f: getattr(self, f) for f in self.FIELDS
                if getattr(self, f) is not None}

    def formatted(self) -> dict:
        return {f: fmt(v) for f, v in self.known().items()}

    def __repr__(self):
        body = ", ".join(f"{k}={v}" for k, v in self.known().items())
        return f"Physics({body})"


class Equation:
    __slots__ = ("target", "sources", "formula", "expr", "magnitude")

    def __init__(self, target, formula, expr, magnitude=False):
        self.target = target
        self.formula = formula
        self.expr = expr
        self.magnitude = magnitude
        self.sources = tuple(inspect.signature(formula).parameters)
        assert target in Physics.FIELDS, target
        assert all(s in Physics.FIELDS for s in self.sources), self.sources

    def _inputs(self, physics):
        inputs = {}
        for src in self.sources:
            v = getattr(physics, src)
            if v is None:
                return None
            inputs[src] = v
        return inputs

    def _compute(self, inputs):
        try:
            result = self.formula(**inputs)
        except (ZeroDivisionError, ValueError, OverflowError):
            return None
        return result if Physics._is_valid(result) else None

    def try_apply(self, physics):
        if getattr(physics, self.target) is not None:
            return None
        inputs = self._inputs(physics)
        if inputs is None:
            return None
        result = self._compute(inputs)
        if result is None or not Physics.accepts(self.target, result):
            return None
        setattr(physics, self.target, result)
        return inputs

    def evaluate(self, physics):
        inputs = self._inputs(physics)
        return None if inputs is None else self._compute(inputs)

    def symbolic(self) -> str:
        rhs = self.expr.format(**{s: SYMBOL[s] for s in self.sources})
        return f"{SYMBOL[self.target]} = {rhs}"

    def label(self):
        return f"{self.target} = f({', '.join(self.sources)})"


def _arg(v) -> str:
    s = fmt(v)
    return f"({s})" if v < 0 else s


class PhysicsCalculator:
    MAX_ITERATIONS = 64

    def __init__(self, physics: Physics):
        self.p = physics
        self.equations = self._build_equations()
        self.given = frozenset(physics.known())
        self.trace = {}

    def solve(self) -> Physics:
        for _ in range(self.MAX_ITERATIONS):
            changed = False
            for eq in self.equations:
                inputs = eq.try_apply(self.p)
                if inputs is not None:
                    self.trace[eq.target] = (eq, inputs)
                    changed = True
            if not changed:
                break
        return self.p

    def check_consistency(self, rel_tol=1e-6, abs_tol=1e-9):
        issues = []
        for eq in self.equations:
            stored = getattr(self.p, eq.target)
            if stored is None:
                continue
            expected = eq.evaluate(self.p)
            if expected is None:
                continue
            a, b = (abs(stored), abs(expected)) if eq.magnitude else (stored, expected)
            if not math.isclose(a, b, rel_tol=rel_tol, abs_tol=abs_tol):
                issues.append({
                    "key": eq.target,
                    "symbol": SYMBOL[eq.target],
                    "unit": UNIT[eq.target],
                    "formula": eq.symbolic(),
                    "stored": fmt(stored),
                    "expected": fmt(expected),
                })
        return issues

    @staticmethod
    def _brief(issues):
        seen, out = set(), []
        for it in issues:
            if it["key"] not in seen:
                seen.add(it["key"])
                out.append(it)
        return out

    def explain(self, target):
        steps, seen = [], set()

        def walk(field):
            if field in seen or field not in self.trace:
                return
            seen.add(field)
            eq, inputs = self.trace[field]
            for s in eq.sources:
                walk(s)
            value = getattr(self.p, field)
            sym = SYMBOL[field]
            steps.append({
                "key": field,
                "formula": eq.symbolic(),
                "substituted": f"{sym} = " + eq.expr.format(
                    **{s: _arg(inputs[s]) for s in eq.sources}),
                "display": fmt(value),
                "unit": UNIT[field],
            })

        walk(target)
        return steps

    def hints_for(self, target, limit=3):
        hints = []
        for eq in self.equations:
            if eq.target != target:
                continue
            missing = [s for s in eq.sources if getattr(self.p, s) is None]
            hints.append({"formula": eq.symbolic(), "missing": missing})
        hints.sort(key=lambda h: len(h["missing"]))
        return hints[:limit]

    def _entry(self, key):
        v = getattr(self.p, key)
        return {"key": key, "symbol": SYMBOL[key], "value": v,
                "display": fmt(v), "unit": UNIT[key]}

    def report_target(self, target, rel_tol=1e-6):
        self.solve()
        conflicts = self._brief(self.check_consistency(rel_tol=rel_tol))
        if getattr(self.p, target) is None:
            return {"ok": False, "target": target,
                    "message": "Insufficient data",
                    "hints": self.hints_for(target),
                    "conflicts": conflicts}
        return {"ok": True, **self._entry(target), "target": target,
                "steps": self.explain(target), "conflicts": conflicts}

    def report_all(self, rel_tol=1e-6):
        self.solve()
        conflicts = self._brief(self.check_consistency(rel_tol=rel_tol))
        derived = []
        for key in Physics.FIELDS:
            if key in self.given or getattr(self.p, key) is None:
                continue
            derived.append({**self._entry(key), "steps": self.explain(key)})
        given = [self._entry(k) for k in Physics.FIELDS if k in self.given]
        out = {"ok": bool(derived), "given": given, "derived": derived,
               "conflicts": conflicts}
        if not derived:
            out["message"] = "Insufficient data"
        return out

    @staticmethod
    def _build_equations():
        E = Equation
        e = ELEMENTARY_CHARGE
        pi = math.pi

        return [
            # ── Q ──
            E("Q", lambda I, t: I * t,              "{I} × {t}"),
            E("Q", lambda W, V: W / V,              "{W} / {V}"),
            E("Q", lambda Pw, t, V: Pw * t / V,     "({Pw} × {t}) / {V}"),
            E("Q", lambda N: N * e,                 "{N} × e"),

            # ── N ──
            E("N", lambda Q: Q / e,                 "{Q} / e"),

            # ── I ──
            E("I", lambda Q, t: Q / t,              "{Q} / {t}"),
            E("I", lambda V, R: V / R,              "{V} / {R}"),
            E("I", lambda Pw, V: Pw / V,            "{Pw} / {V}"),
            E("I", lambda Pw, R: math.sqrt(Pw / R), "√({Pw} / {R})", magnitude=True),
            E("I", lambda Q, f: Q * f,              "{Q} × {f}"),

            # ── t ──
            E("t", lambda Q, I: Q / I,              "{Q} / {I}"),
            E("t", lambda W, Pw: W / Pw,            "{W} / {Pw}"),

            # ── V ──
            E("V", lambda I, R: I * R,              "{I} × {R}"),
            E("V", lambda W, Q: W / Q,              "{W} / {Q}"),
            E("V", lambda Pw, I: Pw / I,            "{Pw} / {I}"),
            E("V", lambda Pw, R: math.sqrt(Pw * R), "√({Pw} × {R})", magnitude=True),

            # ── R ──
            E("R", lambda V, I: V / I,              "{V} / {I}"),
            E("R", lambda Pw, I: Pw / (I ** 2),     "{Pw} / {I}²"),
            E("R", lambda V, Pw: (V ** 2) / Pw,     "{V}² / {Pw}"),
            E("R", lambda rho_e, L, A: (rho_e * L) / A, "({rho_e} × {L}) / {A}"),
            E("R", lambda sigma, L, A: L / (A * sigma), "{L} / ({A} × {sigma})"),

            # ── Pw ──
            E("Pw", lambda W, t: W / t,             "{W} / {t}"),
            E("Pw", lambda V, I: V * I,             "{V} × {I}"),
            E("Pw", lambda I, R: (I ** 2) * R,      "{I}² × {R}"),
            E("Pw", lambda V, R: (V ** 2) / R,      "{V}² / {R}"),

            # ── W ──
            E("W", lambda Pw, t: Pw * t,            "{Pw} × {t}"),
            E("W", lambda Q, V: Q * V,              "{Q} × {V}"),

            # ── rho_e ↔ sigma ──
            E("rho_e", lambda R, A, L: (R * A) / L, "({R} × {A}) / {L}"),
            E("rho_e", lambda sigma: 1 / sigma,     "1 / {sigma}"),
            E("sigma", lambda R, L, A: L / (R * A), "{L} / ({R} × {A})"),
            E("sigma", lambda rho_e: 1 / rho_e,     "1 / {rho_e}"),

            # ── inverse R = ρL/A ──
            E("L", lambda R, A, rho_e: (R * A) / rho_e, "({R} × {A}) / {rho_e}"),
            E("A", lambda rho_e, L, R: (rho_e * L) / R, "({rho_e} × {L}) / {R}"),

            # ── inverse R = L/(σA) ──
            E("L", lambda R, sigma, A: R * sigma * A,   "{R} × {sigma} × {A}"),
            E("A", lambda L, R, sigma: L / (R * sigma), "{L} / ({R} × {sigma})"),

            # ── Vol / m / rho ──
            E("Vol", lambda A, L: A * L,            "{A} × {L}"),
            E("A",   lambda Vol, L: Vol / L,        "{Vol} / {L}"),
            E("L",   lambda Vol, A: Vol / A,        "{Vol} / {A}"),
            E("m",   lambda rho, Vol: rho * Vol,    "{rho} × {Vol}"),
            E("rho", lambda m, Vol: m / Vol,        "{m} / {Vol}"),
            E("Vol", lambda m, rho: m / rho,        "{m} / {rho}"),

            # ── A ↔ r ──
            E("A", lambda r: pi * r ** 2,           "π × {r}²"),
            E("r", lambda A: math.sqrt(A / pi),     "√({A} / π)"),

            # ── f / T / circular motion ──
            E("f", lambda T: 1 / T,                 "1 / {T}"),
            E("T", lambda f: 1 / f,                 "1 / {f}"),
            E("T", lambda r, v_vel: (2 * pi * r) / v_vel, "(2π × {r}) / {v_vel}"),
            E("v_vel", lambda r, T: (2 * pi * r) / T,     "(2π × {r}) / {T}"),
            E("r", lambda v_vel, T: (v_vel * T) / (2 * pi), "({v_vel} × {T}) / 2π"),
        ]
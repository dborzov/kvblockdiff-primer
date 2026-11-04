#!/usr/bin/env python3
"""
picks_figdata.py -- the figure data of Part XI ("The Bachelor: picks and misses, measured"), read by
figures/picks.js.

Reads the Bachelor's summaries in /attic/d/bachelor-kv/results/summary/ (hotcache.json, attention.json,
shelf.json, napkin.json; each carries its own receipt) and, for the one series they lack (the hot cache's
LRU reuse curve of the three named configurations beyond B/k = 4), the gzipped replay
results/raw/replay_named.json.gz. Writes one small file per builder, figures/data/picks-*.json, each with a
`receipt` (source files and their sha256, the bachelor-kv git commit) and, where a figure mixes grades,
a grade on every series: measured (exact replay of stored traces), derived (arithmetic or fits on measured
numbers), extrapolated (carried to the Pin's 100K context by a fitted rule).

The primer's assumed shelf design (n_D 4, b 4096, f_D 0.85, n_load 0.05) is not in napkin.json; it is
computed here with the Bachelor's own `bachelor.frontier.best_B`, so run this with the Bachelor's venv:

    /attic/d/bachelor-kv/.venv/bin/python -I analysis/picks_figdata.py

Every headline number of the Bachelor's docs/results.md that a figure shows is checked against the
extracted data at the end; the script stops on a mismatch.
"""
import datetime
import gzip
import hashlib
import json
import math
import os
import subprocess
import sys

BKV = os.environ.get("BACHELOR_KV", "/attic/d/bachelor-kv")
sys.path.insert(0, BKV)
from bachelor.frontier import Design, best_B, loglog_interp, power_law  # noqa: E402
from bachelor.napkin import PIN  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "figures", "data")
SUMMARY = {n: f"results/summary/{n}.json" for n in ("hotcache", "attention", "shelf", "napkin")}
RAW_NAMED = "results/raw/replay_named.json.gz"
NAMED = [("pin-scaled", 0), ("pin-absolute", 0), ("v4-scaled", 32)]   # each named configuration at its own window
GRID = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32, 48, 64]


# ------------------------------------------------------------------ plumbing
def path(rel):
    return os.path.join(BKV, rel)


def sha256(rel):
    with open(path(rel), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def load(name):
    with open(path(SUMMARY[name])) as f:
        return json.load(f)


COMMIT = subprocess.run(["git", "-C", BKV, "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                        check=True).stdout.strip()
DIRTY = bool(subprocess.run(["git", "-C", BKV, "status", "--porcelain", "--", "results"], capture_output=True,
                            text=True).stdout.strip())
TODAY = datetime.date.today().isoformat()


def receipt(sources, grades=None, note=None):
    r = {"script": "analysis/picks_figdata.py", "generated": TODAY, "bachelor_kv": BKV,
         "bachelor_kv_commit": COMMIT, "results_dirty": DIRTY,
         "sources": [{"file": s, "sha256": sha256(s)} for s in sources]}
    if grades:
        r["grades"] = grades
    if note:
        r["note"] = note
    return r


def rnd(x, sig=4):
    """Round floats to `sig` significant digits, recursively."""
    if isinstance(x, bool) or x is None:
        return x
    if isinstance(x, float):
        return float(f"{x:.{sig}g}") if math.isfinite(x) else None
    if isinstance(x, dict):
        return {k: rnd(v, sig) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [rnd(v, sig) for v in x]
    return x


def write(name, obj):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, f"picks-{name}.json")
    with open(p, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print(f"  {os.path.relpath(p, os.path.join(HERE, '..'))}: {os.path.getsize(p) / 1024:.1f} KB")
    return p


def need(v, what):
    if v is None:
        raise SystemExit(f"missing {what}")
    return v


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs)


def ms(stat):
    """A summary's {mean, seq_min, seq_max, ...} reduced to [mean, seq_min, seq_max]."""
    return [stat["mean"], stat["seq_min"], stat["seq_max"]]


CHECKS = []


def check(label, pinned, got, tol=None):
    """`pinned` as printed in docs/results.md; passes within half a unit of its last decimal."""
    if tol is None:
        s = repr(pinned)
        tol = 0.5 * 10 ** (-(len(s.split(".")[1]) if "." in s else 0))
    CHECKS.append((label, pinned, got, got is not None and abs(got - pinned) <= tol + 1e-12))


# ------------------------------------------------------------------ the napkin (picksNapkin)
DESIGNS = [  # id, label, group, family key in best_per_family, grade, assumed-design kind
    ("solo", "solo code for every miss, no dictionary", "global", "solo, global code, rho 0.804", "derived", None),
    ("solo-light", "solo code for misses + light dictionary shelf", "global", "solo+light", "extrapolated", None),
    ("light", "light dictionaries on a shelf", "shelf", "light", "extrapolated", "light"),
    ("hs-best", "HiSparse, hot cache resized", "hisparse", "HiSparse, best B", "derived", None),
    ("mid", "mid dictionaries on a shelf", "shelf", "mid", "extrapolated", None),
    ("light-all", "light dictionaries, every stretch resident", "shelf", "light dictionaries, all resident", "derived", None),
    ("tree", "tree dictionaries on a shelf", "shelf", "tree", "extrapolated", "tree"),
    ("hs-pub", "HiSparse as published (B = 4096)", "hisparse", "HiSparse as published, B = 4096", "derived", None),
]
CURVES = {"hisparse_measured": loglog_interp({2048: 0.30, 4096: 0.134, 8192: 0.067}, 1.08),
          "stand_in_prediction": power_law(0.36, 2048, 1.07)}   # as analysis/napkin.py of the Bachelor


def napkin():
    nap = load("napkin")
    out = {"about": "Sequences per GPU at the Pin (GLM-5.1, 8 × H200) for each serving design at the hot-cache "
                    "size B that maximises N = min(N_link, N_hbm). Shelf designs carry two ends: f_D and loads "
                    "extrapolated to 100K with the scaling rule's steepest and flattest β. 'assumed' is the "
                    "primer's design (n_D 4, b 4096, f_D 0.85, n_load 0.05), computed with bachelor.frontier.best_B.",
           "dict_kinds": nap["dict_kinds"], "solo": nap["solo"], "rig": {k: nap["rig"][k] for k in ("L", "k", "NL", "e", "tpot", "link", "hbm")},
           "groups": {"hisparse": "HiSparse, no compression", "shelf": "per-sequence stretch dictionaries",
                      "global": "a global code, no per-sequence bytes"},
           "designs": [{"id": i, "label": lab, "group": g, "grade": gr} for i, lab, g, _, gr, _ in DESIGNS],
           "curves": {}}
    labels = {"hisparse_measured": "HiSparse's measured miss curve (GLM-5.1: 30 / 13.4 / 6.7 % at B = 2048 / 4096 / 8192)",
              "stand_in_prediction": "the stand-in's prediction for the Pin (Qwen 2.5 1.5B: 36 % at B = k, slope 1.07)"}
    for cname, m_of in CURVES.items():
        c = nap["curves"][cname]
        fam, rows = c["best_per_family"], c["rows"]

        def row_of(design, end):
            hit = [r for r in rows if r["design"] == design and r.get("end") == end]
            if len(hit) != 1:
                raise SystemExit(f"napkin: {len(hit)} rows for {design} / {end}")
            r = hit[0]
            return {"N": r["N"], "B": r["B"], "binds": r["binds"], "n_D": r.get("n_D"), "b": r.get("b"),
                    "f_D": r.get("fD"), "n_load": r.get("nload"), "m": r.get("m")}

        def row_plain(design):
            hit = [r for r in rows if r["design"] == design]
            r = hit[0]
            return {"N": r["N"], "B": r["B"], "binds": r["binds"], "m": r.get("m")}

        drows = {}
        for did, _, _, key, _, kind in DESIGNS:
            f = need(fam.get(key), f"napkin {cname} family {key}")
            if "N" in f:
                d = row_plain(key)
            else:
                d = {"low": row_of(f["f_D_low_at"], "f_D_low"), "high": row_of(f["f_D_high_at"], "f_D_high")}
                if abs(d["low"]["N"] - f["f_D_low"]) > 1e-9 or abs(d["high"]["N"] - f["f_D_high"]) > 1e-9:
                    raise SystemExit(f"napkin {cname} {key}: best row does not match the family's N")
            if kind:
                a = best_B(PIN, Design(kind, "block-cache", kind, b=4096, nD=4, fD=0.85, nload=0.05), m_of)
                d["assumed"] = {"N": a["N"], "B": a["B"], "binds": a["binds"], "n_D": 4, "b": 4096, "f_D": 0.85, "n_load": 0.05}
            drows[did] = d
        alt = fam["solo, global code, rho 0.778"]
        drows["solo"]["alt"] = {"rho": 0.778, "N": alt["N"], "B": alt["B"]}
        out["curves"][cname] = {"label": labels[cname], "rows": drows}
    out = rnd(out, 5)
    out["receipt"] = receipt([SUMMARY["napkin"]], {"HiSparse rows, solo, light every stretch resident": "derived",
                                                   "shelf rows (ranges)": "extrapolated",
                                                   "assumed design": "derived from the primer's assumed f_D 0.85, n_load 0.05"},
                             note=f"napkin.json receipt: {nap['receipt']['script']} at {nap['receipt']['git_commit'][:7]}")
    hm = out["curves"]["hisparse_measured"]["rows"]
    check("napkin: HiSparse as published", 109.5, hm["hs-pub"]["N"])
    check("napkin: HiSparse resized", 126, hm["hs-best"]["N"], 0.5)
    check("napkin: light resident", 116, hm["light-all"]["N"], 0.5)
    check("napkin: mid shelf", 123, hm["mid"]["high"]["N"], 0.5)
    check("napkin: light shelf low", 127, hm["light"]["low"]["N"], 0.5)
    check("napkin: light shelf high", 132, hm["light"]["high"]["N"], 0.5)
    check("napkin: tree shelf low", 105, hm["tree"]["low"]["N"], 0.5)
    check("napkin: tree shelf high", 107, hm["tree"]["high"]["N"], 0.5)
    check("napkin: solo + light low", 140, hm["solo-light"]["low"]["N"], 0.5)
    check("napkin: solo + light high", 141, hm["solo-light"]["high"]["N"], 0.5)
    check("napkin: solo", 141, hm["solo"]["N"], 0.5)
    check("napkin: solo at 0.778", 143, hm["solo"]["alt"]["N"], 0.5)
    check("napkin: assumed light", 141, hm["light"]["assumed"]["N"], 0.5)
    check("napkin: assumed tree", 56, hm["tree"]["assumed"]["N"], 0.5)
    check("napkin: resized B", 4750, hm["hs-best"]["B"], 10)
    write("napkin", out)


# ------------------------------------------------------------------ attention mass (picksMass)
def mass():
    a = load("attention")
    r = a["R7_attention_mass"]
    cap = r["captured_g1_W0"]
    ks = [c["k"] for c in cap]
    per_layer = [[cap[i]["per_layer"][l] for i in range(len(ks))] for l in range(r["layers"])]
    sh_t, sh_n = r["shares_of_total"], r["shares_of_nonself"]
    out = {"about": "Share of the non-self attention mass held by the top-k positions (exact attention of Qwen 2.5 1.5B, "
                    "g = 1, no resident window), steps t ≥ 8192; mean over 140 (sequence, layer) pairs, range of the five "
                    "per-sequence means; per layer: mean over the five sequences.",
           "grade": "measured", "k": ks, "layers": r["layers"],
           "mean": [c["mean"] for c in cap], "seq_min": [c["seq_min"] for c in cap], "seq_max": [c["seq_max"] for c in cap],
           "per_layer": per_layer,
           "self": {"of": "total", "mean": sh_t["self"]["mean"], "per_layer": sh_t["self"]["per_layer"]},
           "sink": {"of": "non-self", "positions": 4, "mean": sh_n["sink"]["mean"], "per_layer": sh_n["sink"]["per_layer"]},
           "window128": {"of": "non-self", "positions": 128, "mean": sh_n["window_128"]["mean"], "per_layer": sh_n["window_128"]["per_layer"]}}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["attention"]], note=f"attention.json receipt: {a['receipt']['script']} at {a['receipt']['repo_commit'][:7]}")
    for k, v in zip([16, 64, 256, 512, 1024, 2048], [0.59, 0.72, 0.82, 0.87, 0.91, 0.95]):
        check(f"mass: top-{k}", v, out["mean"][ks.index(k)])
    check("mass: sink", 0.24, out["sink"]["mean"])
    check("mass: last 128", 0.40, out["window128"]["mean"])
    check("mass: self, layer 0", 0.39, out["self"]["per_layer"][0])
    write("mass", out)


# ------------------------------------------------------------------ reuse curve (picksReuse)
def named_lru(raw):
    """LRU miss rate of the named configurations over the B/k grid, from the stack-distance curves of the named
    replay; the rule of the Bachelor's analysis/hotcache.py r3(): a B/k is kept only where every (sequence, layer)
    pair has it on its curve; mean over pairs, range of the per-sequence means; slope = mean over pairs of the
    per-pair log-log fit over B/k in [1, 8]."""
    cases = sorted({s["case"] for s in raw["shards"]})
    out = {}
    for cfg, W in NAMED:
        M = {}   # r -> {case: [m per layer]}
        k = None
        for s in raw["shards"]:
            for v in s["variants"]:
                if v["config"] != cfg or int(v["W"]) != W or v["noise"]:
                    continue
                k = v["k"]
                st = v["stack"]
                for r in GRID:
                    B = int(round(r * k))
                    m = st["misses"][st["B"].index(B)] / st["picks"] if B in st["B"] else None
                    M.setdefault(r, {}).setdefault(s["case"], []).append(m)
        keep = [r for r in GRID if all(len(M[r].get(c, [])) == 28 and None not in M[r][c] for c in cases)]
        curve = []
        for r in keep:
            seq = [mean(M[r][c]) for c in cases]
            curve.append([r, mean([x for c in cases for x in M[r][c]]), min(seq), max(seq)])
        # per-pair slope over [1, 8]
        rr = [r for r in keep if 1 <= r <= 8]
        X = [math.log(r) for r in rr]
        xbar = mean(X)
        alphas = []
        for c in cases:
            for li in range(28):
                Y = [math.log(M[r][c][li]) for r in rr]
                ybar = mean(Y)
                b = sum((x - xbar) * (y - ybar) for x, y in zip(X, Y)) / sum((x - xbar) ** 2 for x in X)
                alphas.append(-b)
        out[cfg] = {"k": k, "W": W, "curve": curve, "slope_1_8": mean(alphas)}
    return out


def reuse(raw):
    hot = load("hotcache")
    lru = named_lru(raw)
    cfgs = {}
    for cfg, W in NAMED:
        rows = [r for r in hot["R1_calibration"] if r["config"] == cfg and r["W"] == W]
        pts = {r["B_over_k"]: {"lru": r["lru_all"]["mean"], "belady": r["belady_all"]["mean"]} for r in rows}
        c = lru[cfg]
        # the raw curve and the summary agree where both exist
        for r in (1, 2, 4):
            got = [p[1] for p in c["curve"] if p[0] == r][0]
            if abs(got - pts[r]["lru"]) > 6e-5 * max(1, pts[r]["lru"] * 10):
                raise SystemExit(f"reuse: {cfg} LRU at B/k = {r}: raw {got:.5f} vs summary {pts[r]['lru']:.5f}")
        g = rows[0]["g"]
        cfgs[cfg] = {"k": rows[0]["k"], "W": W, "g": g,
                     "lru": [[p[0], p[1], p[2], p[3]] for p in c["curve"]],
                     "belady": [[r, pts[r]["belady"]] for r in (1, 2, 4)],
                     "lru_over_belady_2": pts[2]["lru"] / pts[2]["belady"],
                     "slope_1_8": c["slope_1_8"]}
    # cross-check with the summary's sweep at the same k (W = 0, g = 1 is the same replay)
    for cfg, sweep in (("pin-scaled", "sweep-k512"), ("pin-absolute", "sweep-k2048")):
        sw = [x for x in hot["R3_reuse_curve"] if x["config"] == sweep][0]
        for r, m in zip(sw["B_over_k"], sw["m"]):
            got = [p[1] for p in cfgs[cfg]["lru"] if p[0] == r]
            if not got or abs(got[0] - m["mean"]) > 1e-3 * m["mean"] + 1e-6:
                raise SystemExit(f"reuse: {cfg} at B/k {r}: {got} vs {sweep} {m['mean']}")
        sl = [x for x in hot["R3_slope"] if x["config"] == sweep and x["range"] == [1, 8]][0]
        if abs(sl["alpha_pairs"]["mean"] - cfgs[cfg]["slope_1_8"]) > 2e-3:
            raise SystemExit(f"reuse: {cfg} slope {cfgs[cfg]['slope_1_8']} vs {sl['alpha_pairs']['mean']}")
    hs = hot["hisparse"]
    out = {"about": "Hot-cache miss rate against B/k for the three named configurations of the stand-in (each at its own "
                    "resident window): the LRU curve over the B/k grid (mean over 140 (sequence, layer) pairs; the range of "
                    "the five per-sequence means), Bélády's optimum at B/k = 1, 2, 4; HiSparse's three published points "
                    "(GLM-5.1) and the primer's fit to them.",
           "configs": cfgs,
           "hisparse": {"points": [[int(r), m] for r, m in hs["m"].items()], "belady": [[2, hs["belady"]["2"]]],
                        "fit": hs["fit"], "lru_over_belady_2": hs["m"]["2"] / hs["belady"]["2"], "grade": hs["grade"]}}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["hotcache"], RAW_NAMED],
                             {"lru, belady": "measured", "slope_1_8, lru_over_belady_2": "derived",
                              "hisparse": "published (HiSparse, GLM-5.1; the primer's fit)"},
                             note="LRU curves beyond B/k = 4 read from the named replay's stack-distance curves (the summary "
                                  "has them only for the k sweep); checked equal to hotcache.json R1 and R3 where both exist.")
    ps, pa, v4 = (out["configs"][c] for c in ("pin-scaled", "pin-absolute", "v4-scaled"))
    for name, cfg, vals, bel in (("pin-scaled", ps, (0.351, 0.190, 0.097), 0.120), ("pin-absolute", pa, (0.281, 0.100, 0.025), 0.055),
                                 ("v4-scaled", v4, (0.334, 0.179, 0.096), 0.115)):
        for r, v in zip((1, 2, 4), vals):
            check(f"reuse: {name} LRU at B/k {r}", v, [p[1] for p in cfg["lru"] if p[0] == r][0])
        # results.md prints v4-scaled's Bélády as 11.5 %; hotcache.json has 0.1159 (11.6 %): a rounding slip there
        check(f"reuse: {name} Bélády at 2", bel, cfg["belady"][1][1], 0.0015 if name == "v4-scaled" else None)
    check("reuse: pin-scaled slope", 1.07, ps["slope_1_8"])
    check("reuse: pin-scaled LRU / Bélády", 1.58, ps["lru_over_belady_2"])
    check("reuse: HiSparse LRU / Bélády", 1.63, out["hisparse"]["lru_over_belady_2"])
    write("reuse", out)


# ------------------------------------------------------------------ layers (picksLayers)
def layers():
    hot = load("hotcache")
    cfgs = {}
    for cfg, W in NAMED:
        r = [x for x in hot["R4_misses_per_step"] if x["config"] == cfg and x["W"] == W and x["B_over_k"] == 2][0]
        pl = r["per_layer"]
        cfgs[cfg] = {"k": r["k"], "W": W, "g": r["g"], "B": r["B"],
                     "depth": pl["l_over_L"], "m": pl["m"], "m_seq_min": pl["m_seq_min"], "m_seq_max": pl["m_seq_max"],
                     "misses_per_step": pl["misses_per_step"], "p99": pl["p99"], "burst": pl["burst"],
                     "all": {"m": ms(r["all"]["m"]), "misses_per_step": ms(r["all"]["misses_per_step"]),
                             "p50": r["all"]["p50"]["mean"], "p90": r["all"]["p90"]["mean"], "p99": r["all"]["p99"]["mean"],
                             "burst": ms(r["all"]["burst_p99_over_mean"]),
                             "burst_layer_p10_p90": [r["all"]["burst_p99_over_mean"]["layer_p10"], r["all"]["burst_p99_over_mean"]["layer_p90"]],
                             "m_layer_p10_p90": [r["all"]["m"]["layer_p10"], r["all"]["m"]["layer_p90"]]}}
    ps = [x for x in hot["R4_misses_per_step"] if x["config"] == "pin-scaled" and x["W"] == 0][0]
    out = {"about": "Per layer (28 layers of Qwen 2.5 1.5B, depth l / 28) at B/k = 2: the hot cache's LRU miss rate (mean over "
                    "five sequences, range of the per-sequence means) and the burst factor, p99 over mean of the misses per "
                    "step. HiSparse's 13.4 % is its mean over GLM-5.1's 78 layers.",
           "configs": cfgs, "hisparse_m_2": hot["hisparse"]["m"]["2"],
           "hisparse_misses_per_step": ps["hisparse_misses_per_step"]}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["hotcache"]], {"m, misses per step, p99": "measured", "burst": "derived",
                                                     "hisparse": "published (HiSparse, GLM-5.1)"})
    a = out["configs"]["pin-scaled"]["all"]
    check("layers: pin-scaled misses per step", 97, a["misses_per_step"][0], 0.5)
    check("layers: pin-scaled p99", 263, a["p99"], 0.6)
    check("layers: pin-scaled burst", 2.9, a["burst"][0])
    check("layers: burst layer p10", 2.2, a["burst_layer_p10_p90"][0])
    check("layers: burst layer p90", 3.8, a["burst_layer_p10_p90"][1])
    check("layers: m p10", 0.11, a["m_layer_p10_p90"][0])
    check("layers: m p90", 0.29, a["m_layer_p10_p90"][1])
    write("layers", out)


# ------------------------------------------------------------------ collapse (picksCollapse)
def collapse():
    hot = load("hotcache")
    P = [p for p in hot["R3_collapse_points"] if p["r"] in (1, 2, 4)]
    ks = sorted({p["k"] for p in P})
    lines = {}
    for r in (1, 2, 4):
        lines[r] = {}
        for k in ks:
            Q = [p for p in P if p["r"] == r and p["k"] == k and p["steps"] > 0]
            bins = sorted({p["t0"] for p in Q})
            mean_line = []
            for b in bins:
                B = [p for p in Q if p["t0"] == b]
                mean_line.append([mean([k / p["t"] for p in B]), mean([p["m"] for p in B]), len(B)])
            lines[r][k] = {"mean": mean_line, "seq": [[k / p["t"], p["m"], p["case"]] for p in sorted(Q, key=lambda p: (p["case"], p["t"]))]}
    fits = {}
    for f in hot["R3_collapse_fit"]:
        r = f["B_over_k"]
        if r not in (1, 2, 4):
            continue
        fl = f["flexible"]
        fits[r] = {"k_exp": f["a"]["mean"], "t_exp": f["b"]["mean"], "k_exp_at_fixed_s": [fl["beta_k_at_fixed_s"][x] for x in ("mean", "min", "max")],
                   "rms_s": fl["rms_cubic_s"]["mean"], "rms_k": fl["rms_cubic_k"]["mean"],
                   "pin_pred": [fl["pin_pred_cubic_s"][x] for x in ("mean", "min", "max")]}
    hs = hot["hisparse"]
    out = {"about": "Hot-cache LRU miss rate per (budget k, time bin) at fixed B/k against the share of the context picked, "
                    "φ = k / t (t = the bin's mean step). Lines: mean over the five sequences (28 layers averaged); dots: single "
                    "sequences. Fits: log m = c + a log k + b log t over six budgets × five bins; a cubic in log φ against a "
                    "cubic in log k (rms of log m); the budget's exponent at fixed φ.",
           "ks": ks, "lines": {str(r): {str(k): v for k, v in d.items()} for r, d in lines.items()},
           "fits": {str(r): v for r, v in fits.items()},
           "hisparse": {"s": hs["pin"]["k"] / hs["pin"]["t"], "m": {str(r): hs["m"][str(r)] for r in (1, 2, 4)}}}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["hotcache"]], {"points (lines, dots)": "measured", "fits": "derived",
                                                     "pin_pred": "extrapolated", "hisparse": "published (HiSparse, GLM-5.1)"})
    check("collapse: k exponent at fixed s, B/k 2", -0.05, out["fits"]["2"]["k_exp_at_fixed_s"][0])
    check("collapse: its low end", -0.17, out["fits"]["2"]["k_exp_at_fixed_s"][1])
    check("collapse: its high end", 0.14, out["fits"]["2"]["k_exp_at_fixed_s"][2])
    check("collapse: s better than k at 2", 1.8, out["fits"]["2"]["rms_k"] / out["fits"]["2"]["rms_s"])
    check("collapse: s better than k at 4", 2.6, out["fits"]["4"]["rms_k"] / out["fits"]["4"]["rms_s"])
    for r, v in ((1, 0.36), (2, 0.21), (4, 0.12)):
        check(f"collapse: Pin prediction at B/k {r}", v, out["fits"][str(r)]["pin_pred"][0])
    write("collapse", out)


# ------------------------------------------------------------------ heavy stretches (picksHeavy)
def heavy():
    sh = load("shelf")
    R5 = sh["R5"]
    cfgs = {}
    for cfg, v in R5["configs"].items():
        rows = {}
        for r in v["rows"]:
            if r["set"] != "misses":
                continue
            rows[str(r["b"])] = {"real": r["mean_share"], "real_lo": r["mean_share_range"][0], "real_hi": r["mean_share_range"][1],
                                 "twin": r["mean_share_twin"], "twin_lo": r["mean_share_twin_range"][0], "twin_hi": r["mean_share_twin_range"][1],
                                 "lift_top1": r["lift_top1"], "distinct": r["distinct"], "distinct_twin": r["distinct_twin"],
                                 "misses_per_step": r["per_step"]}
        cfgs[cfg] = {"k": v["k"], "g": v["g"], "W": v["W"], "B": v["rows"][0]["B"], "rows": rows}
    out = {"about": "Share of a step's misses held by its heaviest 1 / 2 / 4 / 8 stretches (misses at B/k = 2), mean over steps "
                    "t ≥ 8192 and 140 (sequence, layer) pairs, with the range of the five per-sequence means; the shuffled twin "
                    "permutes the position ids once per sequence, so it has the same misses spread with no locality.",
           "tops": R5["tops"], "configs": cfgs}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["shelf"]], {"shares": "measured", "lift_top1": "derived"})
    r = out["configs"]["pin-scaled"]["rows"]["1024"]
    check("heavy: top 1", 0.31, r["real"][0])
    check("heavy: top 1 twin", 0.09, r["twin"][0])
    check("heavy: top 4", 0.71, r["real"][2])
    check("heavy: top 4 twin", 0.31, r["twin"][2])
    write("heavy", out)


# ------------------------------------------------------------------ the shelf (picksShelf)
POLICIES = ["touched", "heaviest", "popular_P8", "popular_P32"]


def shelf():
    sh = load("shelf")
    R6 = sh["R6"]
    cfgs = {}
    for cfg, v in R6["configs"].items():
        pol = {}
        for p in POLICIES:
            pol[p] = [[r["b"], r["n_D"], r["coverage"], r["f_D"], r["f_D_range"][0], r["f_D_range"][1], r["f_D_twin"], r["lift"], r["n_load_net"]]
                      for r in v["rows"] if r["policy"] == p]
        cfgs[cfg] = {"k": v["k"], "g": v["g"], "W": v["W"], "policies": pol}
    pin = {}
    for p, key in (("popular_P32", "pin_extrapolation"), ("heaviest", "pin_extrapolation_heaviest")):
        pin[p] = [[int(b), int(n), c["coverage"], c["f_D_low"], c["f_D_high"], c["n_load_net"], c["n_load_net_favourable"]]
                  for n, bs in sh[key].items() for b, c in bs.items()]
    pr = sh["pin_rule"]
    cov_4x4096 = [x[2] for x in pin["popular_P32"] if x[0] == 4096 and x[1] == 4][0]
    out = {"about": "δ-miss fraction f_D against the coverage n_D·b / t of the dictionary shelf (share of the context it spans, t the whole sequence), "
                    "at B/k = 2 over steps t ≥ 8192: mean over 140 (sequence, layer) pairs, range of the five per-sequence means, "
                    "the shuffled twin at the same shelf. The Pin's cells: f_D extrapolated to 100K (two ends of the scaling "
                    "rule's exponent) at their own coverage n_D·b / 100K.",
           "columns": ["b", "n_D", "coverage", "f_D", "f_D_lo", "f_D_hi", "f_D_twin", "lift", "n_load_net"],
           "configs": cfgs,
           "pin_columns": ["b", "n_D", "coverage", "f_D_low", "f_D_high", "n_load_net", "n_load_net_favourable"],
           "pin": pin, "pin_L": pr["L"], "pin_beta": {"popular_P32": pr["beta_range_popular_P32"], "heaviest": pr["beta_range_heaviest"]},
           "assumed": {"f_D": 0.85, "n_load": 0.05, "n_D": 4, "b": 4096, "coverage": cov_4x4096},
           "decision": {"affordable": 0.8, "spread": 0.5,
                        "rule": "primer X.9: f_D ≥ 0.8 at n_D ≤ 8 with n_load ≤ 0.1: affordable; 0.5 ≤ f_D < 0.8: partly; f_D < 0.5: spread"}}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["shelf"]], {"f_D, twin, coverage, n_load_net": "measured", "lift": "derived",
                                                  "pin": "extrapolated", "assumed": "the primer's assumption"})
    rows = {(r[0], r[1]): r for r in out["configs"]["pin-scaled"]["policies"]["popular_P32"]}
    for (n, b), (cov, fd, tw, lift, nl) in {(1, 1024): (0.04, 0.21, 0.04, 5.1, 0.035), (4, 1024): (0.15, 0.57, 0.16, 3.6, 0.089),
                                            (8, 1024): (0.30, 0.81, 0.31, 2.6, 0.118), (1, 4096): (0.15, 0.46, 0.15, 3.0, 0.017),
                                            (4, 4096): (0.60, 0.94, 0.60, 1.6, 0.018)}.items():
        r = rows[(b, n)]
        check(f"shelf: {n}×{b} coverage", cov, r[2])
        check(f"shelf: {n}×{b} f_D", fd, r[3])
        check(f"shelf: {n}×{b} twin", tw, r[6])
        check(f"shelf: {n}×{b} lift", lift, r[7])
        check(f"shelf: {n}×{b} loads", nl, r[8])
    check("shelf: 4×1024 f_D low", 0.54, rows[(1024, 4)][4])
    check("shelf: 4×1024 f_D high", 0.60, rows[(1024, 4)][5])
    pins = {(x[1], x[0]): x for x in out["pin"]["popular_P32"]}
    for (n, b), (lo, hi, l0, l1) in {(1, 4096): (0.11, 0.20, 0.04, 0.06), (4, 4096): (0.36, 0.54, 0.10, 0.13),
                                     (8, 4096): (0.56, 0.76, 0.14, 0.20), (16, 4096): (0.78, 0.95, 0.15, 0.29),
                                     (1, 1024): (0.04, 0.07, 0.09, 0.14), (4, 1024): (0.13, 0.24, 0.19, 0.29),
                                     (8, 1024): (0.23, 0.40, 0.27, 0.38), (16, 1024): (0.35, 0.60, 0.40, 0.61)}.items():
        x = pins[(n, b)]
        check(f"shelf: Pin {n}×{b} f_D low", lo, x[3])
        check(f"shelf: Pin {n}×{b} f_D high", hi, x[4])
        check(f"shelf: Pin {n}×{b} loads favourable", l0, x[6])
        check(f"shelf: Pin {n}×{b} loads", l1, x[5])
    write("shelf", out)


# ------------------------------------------------------------------ the shelf's scaling rule (picksShelfScaling)
def shelf_scaling():
    sh = load("shelf")
    fs = sh["R6_time_bins_fixed_share"]
    sr = sh["scaling_rule"]["collapse"]
    rows = {}
    for p in ("popular_P32", "heaviest"):
        rows[p] = [[r["b"], r["n_D"], r["f_D"], r["n_load_net"]] for r in fs["rows"] if r["policy"] == p]
    rule = {}
    for p in ("popular_P32", "heaviest"):
        f = sr[p]["fixed_share"]
        rule[p] = {"beta": f["beta_hat"], "beta_range": f["beta_hat_range"],
                   "rms_logit": {"b": f["rms_logit"]["iii_absolute"], "b_over_t": f["rms_logit"]["ii_scale_free"], "fitted": f["rms_logit"]["fitted"]},
                   "loads_beta": sh["scaling_rule"]["loads_collapse_fixed_share"][p]["beta_hat"]}
    pin = {}
    for p, key in (("popular_P32", "pin_extrapolation"), ("heaviest", "pin_extrapolation_heaviest")):
        pin[p] = [[int(b), int(n), c["f_D_low"], c["f_D_high"], c["f_D_scale_free"]] for n, bs in sh[key].items() for b, c in bs.items()]
    out = {"about": "f_D per time bin at the Pin's share φ = k / t = 2 % (k interpolated in ln k to 0.02·t over the budget sweep), "
                    "B/k = 2, mean over the sequences in the bin (five; four in the last). The rule: f_D at a fixed shelf depends "
                    "on the stretch only through b / t^γ (γ fitted, 1.27); the x of the scaled views is b·(L/t)^γ, the stretch length at the Pin's "
                    "L = 100 384 that a cell stands for. rms_logit: residual of logit f_D around the per-n_D collapse curve.",
           "t_mid": fs["t_mid_mean"], "n_seq": [5, 5, 5, 5, 4], "s": fs["s"], "L": sh["pin_rule"]["L"],
           "columns": ["b", "n_D", "f_D per bin", "n_load_net per bin"], "rows": rows, "rule": rule,
           "pin_columns": ["b", "n_D", "f_D_low", "f_D_high", "f_D_scale_free"], "pin": pin}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["shelf"]], {"f_D per bin": "derived (interpolated in ln k between measured budgets)",
                                                  "rule": "derived", "pin": "extrapolated"})
    r = out["rule"]["popular_P32"]
    check("scaling: β", 1.27, r["beta"])
    check("scaling: β low", 0.93, r["beta_range"][0])
    check("scaling: β high", 1.44, r["beta_range"][1])
    check("scaling: residual fitted", 0.12, r["rms_logit"]["fitted"])
    check("scaling: residual b", 0.42, r["rms_logit"]["b"])
    check("scaling: residual b/t", 0.15, r["rms_logit"]["b_over_t"])
    write("shelf-scaling", out)


# ------------------------------------------------------------------ indexer errors (picksNoise)
def noise():
    hot = load("hotcache")
    rows = []
    for v in hot["R8c_probes"]["noise"]:
        rows.append({"variant": v["variant"], "mode": v["mode"], "sigma": v["sigma"], "recall": v["recall"]["mean"],
                     "m": {r: ms(v[f"m_B{r}k"]) for r in ("1", "2", "4")}})
    ex = [r for r in rows if r["mode"] == "exact"][0]
    for r in rows:
        r["ratio"] = {b: r["m"][b][0] / ex["m"][b][0] for b in ("1", "2", "4")}
    hs = hot["hisparse"]["m"]
    out = {"about": "Hot-cache LRU miss rate of pin-scaled (k = 512, W = 0) when the stand-in's exact ranking is re-ranked "
                    "by log(rank + 1) + σ·N(0, 1) over its stored top candidates: 'iid' draws the noise afresh per step and "
                    "position (errors churn), 'persistent' once per position (errors are stable). Recall = |noisy ∩ exact| / k. "
                    "ratio = m / m of the exact stand-in at the same B/k.",
           "rows": rows, "hisparse": {b: hs[b] for b in ("1", "2", "4")}}
    out = rnd(out, 4)
    out["receipt"] = receipt([SUMMARY["hotcache"]], {"m, recall": "measured", "ratio": "derived",
                                                     "hisparse": "published (HiSparse, GLM-5.1)"})
    by = {(r["mode"], r["sigma"]): r for r in out["rows"]}
    for sg, rec, fi, pe in ((0.5, 0.80, 1.35, 0.95), (1.0, 0.64, 2.04, 0.85), (2.0, 0.46, 2.83, 0.71)):
        check(f"noise: recall σ {sg}", rec, by[("iid", sg)]["recall"])
        check(f"noise: per step ×, σ {sg}", fi, by[("iid", sg)]["ratio"]["2"])
        check(f"noise: persistent ×, σ {sg}", pe, by[("persistent", sg)]["ratio"]["2"])
    write("noise", out)


def main():
    print(f"bachelor-kv {COMMIT}{' (results dirty)' if DIRTY else ''}; writing figures/data/picks-*.json")
    with gzip.open(path(RAW_NAMED), "rt") as f:
        raw = json.load(f)
    napkin()
    mass()
    reuse(raw)
    layers()
    collapse()
    heavy()
    shelf()
    shelf_scaling()
    noise()
    bad = [c for c in CHECKS if not c[3]]
    print(f"checks against docs/results.md: {len(CHECKS) - len(bad)} of {len(CHECKS)} pass")
    for label, pinned, got, _ in bad:
        print(f"  MISMATCH {label}: results.md {pinned}, data {got}")
    if bad:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

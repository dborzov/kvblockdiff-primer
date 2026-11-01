"""Part XII (range-curve): the measured compressibility curve under a dictionary budget, re-read from the ledgers.

Reads, READ-ONLY, from the experiments repo (env KVCR_REPO, default /attic/d/kv-compress-roofline):
  * research/agents/*/ledger.jsonl       one JSON object per trial; scores live per track
  * research/c1/KNOWLEDGE.md              the [budget/*] tags, to learn which trials the campaign cites
  * research/ASK_HUMAN.md                 r1.Q1, the page where the curve was first quoted (fallback receipt)
Never runs kvcr and never writes there.

Writes figures/data/range-curve.json:
  {source: {...}, points: [{x, y, ratio, coder, name, track, trial, role, grade: "ledger"|"page", note, ...}],
   share_pair: {...}, best_per_budget: [...]}
The curve (role "curve") is campaign C1's coder 30-copy-shrink on values of layer 3, head 0, 4096-token blocks, at
dictionary budgets x <= 0.02 / 0.10 / 0.25 (tracks v-l3h0-fp8-b4k-x02 / -x10 / -x25) and unconstrained
(v-l3h0-fp8-b4k). Landmarks: the C2 tree point (env-t0096), the light coder (r25-t0003), the all-dictionary point
(r1-t0068), solo coded (r1-t0005) and solo ideal (the ledger landmark), the baseline (env-t0001); plus the 91 -> 109
pair of XII.1 and the later best coder per budget (49 / 37 / 34), for honesty. If a budget point has no ledger row the
ASK_HUMAN number is kept with grade "page" and the receipt `research/ASK_HUMAN.md r1.Q1`.

Ends with a check table: the numbers pinned in docs/plans/part-xii-spec.md section 1.1 against what was found.
stdlib only. Run: python3 analysis/range_extract.py
"""
import datetime
import glob
import json
import os
import re
import subprocess
import sys

REPO = os.environ.get("KVCR_REPO", "/attic/d/kv-compress-roofline")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "figures", "data", "range-curve.json")

# ---------------------------------------------------------------- the spec's numbers (section 1.1), the fallback
SPEC = {  # budget x_max -> (ratio, dictionary share, delta share) as quoted on research/ASK_HUMAN.md r1.Q1
    0.02: (0.7532, 0.02, 0.733), 0.10: (0.7095, 0.10, 0.610), 0.25: (0.6906, 0.25, 0.441), None: (0.6815, 0.36, 0.322)}
ASK = "research/ASK_HUMAN.md r1.Q1 (r1 session-2 measurement of the curve, best coder per budget, 30-copy-shrink)"
KNOW = "research/c1/KNOWLEDGE.md [budget/frontier], [budget/shape]"
CODER = "30-copy-shrink"
FREE = "v-l3h0-fp8-b4k"
BUDGET_RE = re.compile(r"^v-l3h0-fp8-b4k(?:-x(\d\d))?$")

# ---------------------------------------------------------------- ledgers
ROWS = {}
for f in sorted(glob.glob(os.path.join(REPO, "research/agents/*/ledger.jsonl"))):
    for line in open(f):
        if line.strip():
            r = json.loads(line)
            if r["id"] in ROWS:
                raise SystemExit(f"duplicate ledger id {r['id']}")
            ROWS[r["id"]] = r
if not ROWS:
    raise SystemExit(f"no ledgers under {REPO}/research/agents/*/ledger.jsonl (set KVCR_REPO)")

USED = set()
NOTES = []


def ok_result(r, track):
    """The per-track result of a row if it is a usable dev-split score, else None."""
    t = r.get("tracks", {}).get(track)
    if not t or t.get("status") != "ok" or t.get("split", "dev") != "dev":
        return None
    return t


def coder_of(r):
    num, slug = r["algorithm"].split("-", 1)
    return int(num), slug


def verified(r, t):
    v = t.get("verification") or {}
    return (not r.get("quick")) and v.get("isolated") is True


def budget_of(track):
    m = BUDGET_RE.match(track)
    if not m:
        return None
    return None if m.group(1) is None else int(m.group(1)) / 100


def point(trial, track, role, **extra):
    r = ROWS[trial]
    t = ok_result(r, track)
    if t is None:
        raise SystemExit(f"{trial} {track}: no ok dev result")
    USED.add(trial)
    num, slug = coder_of(r)
    p = {"x": round(t["x"], 4), "y": round(t["y"], 4), "ratio": round(t["score"], 5), "coder": num, "name": slug,
         "track": track, "trial": trial, "role": role, "grade": "ledger", "verified": verified(r, t),
         "budget": budget_of(track), "b": 4096, "n_blocks": t.get("n_blocks"), "w": t.get("w"),
         "per_sequence": {k: round(v["ratio"], 5) for k, v in sorted((t.get("per_sequence") or {}).items())}}
    p.update(extra)
    return p


def best(coder_slug, track, quick_ok=False):
    """The lowest-scoring ok dev result of one coder on one track: (trial, result) or (None, None)."""
    found = []
    for r in ROWS.values():
        if r["algorithm"] != coder_slug or (r.get("quick") and not quick_ok):
            continue
        t = ok_result(r, track)
        if t is not None:
            found.append((t["score"], r["id"]))
    if not found:
        return None, None
    found.sort()
    return found[0][1], ROWS[found[0][1]]


# ---------------------------------------------------------------- the curve: coder 30 at every 4k budget
points = []
for xmax, (ratio_spec, x_spec, y_spec) in SPEC.items():
    track = FREE if xmax is None else f"{FREE}-x{int(round(xmax * 100)):02d}"
    trial, r = best(CODER, track)
    label = "unconstrained (k = 2)" if xmax is None else f"dictionary share <= {xmax:.2f}"
    if trial:
        p = point(trial, track, "curve", note=f"C1, {label}: coder 30-copy-shrink, values of layer 3 head 0, 4096-token blocks, no read budget; {KNOW}")
        p["spec"] = {"ratio": ratio_spec, "x": x_spec, "y": y_spec}
        others = [(ROWS[i]["id"], round(ok_result(ROWS[i], track)["score"], 5)) for i in ROWS
                  if ROWS[i]["algorithm"] == CODER and ok_result(ROWS[i], track) and i != trial]
        if others:
            p["other_trials_same_coder"] = others
        points.append(p)
    else:
        NOTES.append(f"{track}: no ledger row for {CODER}; kept the ASK_HUMAN number with grade page")
        points.append({"x": x_spec, "y": y_spec, "ratio": ratio_spec, "coder": 30, "name": "copy-shrink", "track": track,
                       "trial": None, "role": "curve", "grade": "page", "verified": False, "budget": xmax, "b": 4096,
                       "receipt": ASK, "note": f"C1, {label}: number as quoted on the page; no ledger row found",
                       "spec": {"ratio": ratio_spec, "x": x_spec, "y": y_spec}})

# ---------------------------------------------------------------- landmarks
TREE = "s-layer-b4k-r293"
points.append(point("env-t0096", TREE, "tree", note="C2 tree coder 121 stack-rows on layer entries (512 B), the screen of a tenth of the blocks, read budget 293; the heavy point of XII.4-5"))
points.append(point("r25-t0003", TREE, "light", note="C2 light no-tree coder 129 pure-wls on layer entries: 2 % of dictionary buys 0.09 of ratio"))
points.append(point("r1-t0068", FREE, "all-dictionary", note="C1 coder 43 fast-lean with every entry in the dictionary (y = 0): the sequential-compression corner, set aside by C1 (about 1,490 reads per entry)"))
points.append(point("r1-t0005", FREE, "solo-coded", note="C1 coder 9 blockstats-logistic-tail: per-channel statistics only, the best real solo coder on layer 3 head 0"))
lm = ROWS["r1-t0005"]["tracks"][FREE]["landmark"]
points.append({"x": 0.0, "y": round(lm["solo_ratio"], 4), "ratio": round(lm["solo_ratio"], 5), "coder": None, "name": "solo ideal",
               "track": FREE, "trial": "r1-t0005", "role": "solo-ideal", "grade": "ledger", "verified": True, "budget": None, "b": 4096,
               "bits": round(lm["h0_bits"], 3), "note": "per-channel order-0 entropy of the values of layer 3 head 0: the ledger landmark.solo_ratio of the C1 4k track"})
lm2 = ROWS["env-t0096"]["tracks"][TREE]["landmark"]
points.append({"x": 0.0, "y": round(lm2["solo_ratio"], 4), "ratio": round(lm2["solo_ratio"], 5), "coder": None, "name": "solo ideal, six layers",
               "track": TREE, "trial": "env-t0096", "role": "solo-ideal-c2", "grade": "ledger", "verified": True, "budget": None, "b": 4096,
               "bits": round(lm2["h0_bits"], 3), "note": "the same ideal over all six layers (C2 screens): the solo line of Part XI"})
points.append(point("env-t0001", FREE, "baseline", note="01-baseline, perc = 0: x + y = 1 by construction"))

# the 91 -> 109 pair of XII.1 (the dictionary share stopped mattering for tree coders)
pair_track = "s-head-b4k-u"
share_pair = {"from": point("r6-t0003", pair_track, "pair", note="coder 91 path-records: a tree coder with 0.56 of raw in the dictionary"),
              "to": point("r6-t0004", pair_track, "pair", note="coder 109 subtree-streams: every byte in the dictionary (x = ratio, y = 0)"),
              "receipt": "PART-XI-SPEC.md section 1.9 (101 vs 91: x 0.56 -> 1.00 for +0.00004 in-process, 12 blocks); the ledger pair 91 -> 109 is isolated-verified"}
share_pair["delta_ratio"] = round(share_pair["to"]["ratio"] - share_pair["from"]["ratio"], 5)

# the later best coder per budget (KNOWLEDGE budget/frontier), for honesty: the curve moved down after coder 30
best_per_budget = []
for xmax, slug in ((0.02, "49-facility-codelen"), (0.10, "49-facility-codelen"), (0.25, "37-lean-tables"), (None, "34-mst-anchors")):
    track = FREE if xmax is None else f"{FREE}-x{int(round(xmax * 100)):02d}"
    trial, r = best(slug, track)
    if trial:
        best_per_budget.append(point(trial, track, "best-per-budget", note=f"the best coder at this budget by the end of C1 ({KNOW})"))
    else:
        NOTES.append(f"{track}: no ledger row for {slug} (best-per-budget extra skipped)")

# which trials does KNOWLEDGE's budget section cite? (a cross-check, recorded in the notes)
know_path = os.path.join(REPO, "research/c1/KNOWLEDGE.md")
cited = set()
if os.path.exists(know_path):
    text = open(know_path).read()
    m = re.search(r"^## Dictionary budgets.*?(?=^## )", text, re.S | re.M)   # the section that carries the [budget/*] tags
    section = m.group(0) if m else "\n".join(l for l in text.splitlines() if "[budget/" in l)
    cited.update(re.findall(r"\b(r\d+-t\d{4})\b", section))
    curve_trials = {p["trial"] for p in points if p["role"] == "curve"}
    best_trials = {p["trial"] for p in best_per_budget}
    NOTES.append(f"KNOWLEDGE 'Dictionary budgets' section cites {len(cited)} trials: of the curve's {sorted(curve_trials)} it cites {sorted(curve_trials & cited)} "
                 f"(budget/frontier quotes coder 30's scores without trial ids); of the best-per-budget extras it cites {sorted(best_trials & cited)}")
else:
    NOTES.append("research/c1/KNOWLEDGE.md not found; the budget tags were not cross-checked")
NOTES.append("the spec's delta shares 0.441 / 0.322 at x <= 0.25 / free are ratio minus the nominal budget (0.25 / 0.36); the ledger's y are 0.4425 / 0.3250 because x was 0.2481 / 0.3564 — the check table reports the ledger's y")

# ---------------------------------------------------------------- write
commit = subprocess.run(["git", "-C", REPO, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip() or None
out = {
    "source": {"generated_at": datetime.date.today().isoformat(), "generated_by": "analysis/range_extract.py", "kvcr_repo": REPO,
               "ledger_commit": commit, "trials": sorted(USED),
               "what": "the compressibility curve under a dictionary budget: x = dictionary share of the raw bytes, y = delta share, ratio = x + y (MDL, all costs included)",
               "curve": "C1, coder 30-copy-shrink, values of layer 3 head 0 (256 B entries), FP8 E4M3, 4096-token blocks, dev split (2 sequences), no read budget; tracks v-l3h0-fp8-b4k and -x02 / -x10 / -x25 (x_max budgets)",
               "grades": {"ledger": "ratio, x, y from the ledger row of `trial`", "page": "number as quoted on the receipt page; no ledger row found"},
               "receipts": [ASK, KNOW], "notes": NOTES},
    "points": points, "share_pair": share_pair, "best_per_budget": best_per_budget,
}
with open(OUT, "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write("\n")
print(f"wrote {OUT} ({os.path.getsize(OUT):,} bytes)")

# ---------------------------------------------------------------- check table
CHECKS = []


def check(label, pinned, found, tol=None):
    if tol is None:
        s = repr(pinned)
        tol = 0.5 * 10 ** (-(len(s.split(".")[1]) if "." in s else 0))
    CHECKS.append((label, pinned, found, found is not None and abs(found - pinned) <= tol + 1e-12))


by_role = {}
for p in points:
    by_role.setdefault(p["role"], []).append(p)
for p in by_role["curve"]:
    tag = "free" if p["budget"] is None else f"x <= {p['budget']:.2f}"
    check(f"curve {tag}: ratio ({p['trial'] or 'page'}, {p['grade']})", p["spec"]["ratio"], p["ratio"])
    check(f"curve {tag}: delta share y", p["spec"]["y"], p["y"])
    if p["budget"] is None:
        check("curve free: dictionary share x ~ 0.36", 0.36, p["x"], tol=0.01)
    else:
        check(f"curve {tag}: x within budget", p["budget"], p["x"], tol=p["budget"] * 0.02 + 1e-9)
tree = by_role["tree"][0]
check("tree point env-t0096: x", 0.525, tree["x"])
check("tree point env-t0096: y", 0.112, tree["y"])
check("tree point env-t0096: ratio", 0.6364, tree["ratio"])
light = by_role["light"][0]
check("light coder r25-t0003: x", 0.021, light["x"])
check("light coder r25-t0003: y", 0.665, light["y"])
check("light coder r25-t0003: ratio", 0.6863, light["ratio"])
check("all-dictionary r1-t0068: ratio = x", 0.6705, by_role["all-dictionary"][0]["ratio"])
check("all-dictionary r1-t0068: y = 0", 0.0, by_role["all-dictionary"][0]["y"])
check("solo coded r1-t0005: ratio", 0.804, by_role["solo-coded"][0]["ratio"])
check("solo ideal (ledger landmark, layer 3 head 0)", 0.7999, by_role["solo-ideal"][0]["ratio"])
check("solo ideal, six layers (C2 landmark)", 0.778, by_role["solo-ideal-c2"][0]["ratio"])
check("pair: coder 91 x", 0.56, share_pair["from"]["x"])
check("pair: coder 109 share of coded bytes x / ratio", 1.0, share_pair["to"]["x"] / share_pair["to"]["ratio"])
# the convexity claim: 2 % of dictionary buys 42 % of the gain, 10 % buys 77 % (gain = solo coded -> free)
solo = by_role["solo-coded"][0]["ratio"]
free = next(p for p in by_role["curve"] if p["budget"] is None)["ratio"]
for xmax, share in ((0.02, 0.42), (0.10, 0.77)):
    p = next(p for p in by_role["curve"] if p["budget"] == xmax)
    check(f"convexity: {int(xmax * 100)} % of dictionary buys this share of the gain", share, (solo - p["ratio"]) / (solo - free), tol=0.01)

print("\nspec section 1.1 vs found:")
bad = 0
for label, pinned, found, ok in CHECKS:
    bad += not ok
    print(f"  {'ok      ' if ok else 'MISMATCH'} {label:<64} {pinned!s:>8} {('%.5g' % found) if found is not None else 'none':>10}")
print(f"{len(CHECKS)} checks, {bad} mismatch(es)")
for n in NOTES:
    print("  note:", n)
sys.exit(1 if bad and os.environ.get("RANGE_STRICT") else 0)

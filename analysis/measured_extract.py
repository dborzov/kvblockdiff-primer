"""Part XI (measured-*): the ledger-derived data behind figures/measured.js.

Reads, from the experiments repo (env KVCR_REPO, default /attic/d/kv-compress-roofline; read-only):
  * research/agents/<id>/ledger.jsonl        one JSON object per trial; scores live per track
  * research/agents/env/pages/STATUS.md      the "Every track with an incumbent" table (track -> trial)
  * research/agents/env/pages/reads-recheck.json   the every-entry read recount (cross-check of dict_reads)
  * algorithms/                               only counted
and analysis/measured_pages.json (numbers that exist only on iteration pages, hand-entered with receipts).

Writes the seven files of PART-XI-SPEC.md section 4 into figures/data/:
  measured-points.json, measured-ladders.json, measured-splits.json, measured-reads.json,
  measured-memory.json, measured-noise.json, measured-time.json
Every file has a top-level "source" {generated_at, ledger_commit, trials, notes}.
Ratios, x, y and reads are taken from the ledger row of the named trial (never from STATUS.md text); where
STATUS.md's rounded text disagrees, source.notes says so. Ends with a check table: the pinned numbers of
spec section 1 against what was extracted (a mismatch is printed, never corrected on either side).

stdlib only. Run: python3 analysis/measured_extract.py
"""
import datetime
import glob
import json
import os
import re
import statistics
import subprocess
import sys

REPO = os.environ.get("KVCR_REPO", "/attic/d/kv-compress-roofline")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "figures", "data")
PAGES = json.load(open(os.path.join(HERE, "measured_pages.json")))

# ---------------------------------------------------------------- ledgers
ROWS = {}
AGENTS = set()
for f in sorted(glob.glob(os.path.join(REPO, "research/agents/*/ledger.jsonl"))):
    AGENTS.add(os.path.basename(os.path.dirname(f)))
    for line in open(f):
        if line.strip():
            r = json.loads(line)
            assert r["id"] not in ROWS, r["id"]
            ROWS[r["id"]] = r

USED = set()
NOTES = []


def row(trial):
    USED.add(trial)
    return ROWS[trial]


def res(trial, track):
    """The per-track result object of one trial (status must be ok)."""
    t = row(trial)["tracks"][track]
    if t.get("status") != "ok":
        raise SystemExit(f"{trial} {track}: status {t.get('status')}")
    return t


def coder_of(trial):
    alg = row(trial)["algorithm"]
    num, slug = alg.split("-", 1)
    return int(num), slug


def verified(trial, track):
    r = row(trial)
    v = r["tracks"][track].get("verification") or {}
    return (not r.get("quick")) and v.get("isolated") is True


def reads_of(t):
    d = t.get("dict_reads") or {}
    if d.get("mean_entries") is None:
        return None, False
    return ({"mean": round(d["mean_entries"], 1), "p99": d.get("p99_entries"),
             "max": round(d["max_entries"], 1)}, bool(d.get("every_entry")))


def per_seq(t):
    return {k: round(v["ratio"], 5) for k, v in sorted((t.get("per_sequence") or {}).items())}


BLOCK = {"512": 512, "4k": 4096, "16k": 16384, "32k": 32768}
TIER = {None: ("03", 2, "dev run"), "s": ("03", 2, "screen: a tenth of the blocks"),
        "st02n5": ("02", 5, "a ninth of the blocks"), "st02n10": ("02", 10, "a ninth of the blocks"),
        "st02n20": ("02", 20, "a ninth of the blocks"), "t02n5": ("02", 5, "all blocks")}
C2_RE = re.compile(r"^(?:(s|st02n5|st02n10|st02n20|t02n5)-)?(head|layer|pair|triple|regime|column|token|tok\d+)-b(512|4k|16k|32k)-(u|r\d+)$")
C1_RE = re.compile(r"^v-l3h0-(fp8|bf16)-b(512|4k|16k|32k)$")


def parse_track(name):
    m = C2_RE.match(name)
    if m:
        tier, split, b, budget = m.groups()
        target, nseq, _ = TIER[tier]
        return {"split": split, "b": BLOCK[b], "budget": None if budget == "u" else int(budget[1:]),
                "target": target, "n_sequences": nseq, "campaign": "C2", "layers": "all six"}
    m = C1_RE.match(name)
    if m:
        fmt, b = m.groups()
        return {"split": "head", "b": BLOCK[b], "budget": None, "target": "03", "n_sequences": 2,
                "campaign": "C1", "layers": "layer 3, head 0", "format": fmt}
    raise SystemExit("unknown track " + name)


def point(trial, track, role, **extra):
    t = res(trial, track)
    num, slug = coder_of(trial)
    reads, every = reads_of(t)
    p = {"track": track, **parse_track(track), "coder": num, "name": slug, "ratio": round(t["score"], 5),
         "x": round(t["x"], 4), "y": round(t["y"], 4), "reads": reads, "every_entry": every, "trial": trial,
         "verified": verified(trial, track), "n_blocks": t.get("n_blocks"), "n_entries": t.get("n_entries"),
         "per_sequence": per_seq(t), "role": role}
    p.update(extra)
    return p


# ---------------------------------------------------------------- checks
CHECKS = []


def check(label, pinned, extracted, tol=None):
    if tol is None:  # half a unit of the pinned number's last decimal place
        s = repr(pinned)
        dec = len(s.split(".")[1]) if "." in s else 0
        tol = 0.5 * 10 ** (-dec)
    ok = extracted is not None and abs(extracted - pinned) <= tol + 1e-12
    CHECKS.append((label, pinned, extracted, ok))
    return extracted


def sd(xs):
    return statistics.stdev(xs)


def source(notes=()):
    commit = subprocess.run(["git", "-C", REPO, "rev-parse", "--short", "HEAD"], capture_output=True,
                            text=True, check=True).stdout.strip()
    return {"generated_at": datetime.date.today().isoformat(), "generated_by": "analysis/measured_extract.py",
            "kvcr_repo": REPO, "ledger_commit": commit, "trials": sorted(USED),
            "hand_entered": "analysis/measured_pages.json (blocks carry their own receipt)", "notes": list(notes)}


def hand(key):
    d = dict(PAGES[key])
    d.pop("_file", None)
    return d


def write(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {path} ({os.path.getsize(path):,} bytes)")


# ================================================================ 1. points
status_md = open(os.path.join(REPO, "research/agents/env/pages/STATUS.md")).read()
sect = status_md.split("## Every track with an incumbent", 1)[1].split("\n## ", 1)[0]
incumbents = []
for line in sect.splitlines():
    m = re.match(r"^\| (\S+) \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| (\S+) \| `([^`]+)` \| (\S+) \|$", line)
    if m:
        incumbents.append(m.groups())
assert len(incumbents) >= 20, len(incumbents)

points = []
for track, mdl, x, y, reads, alg, trial in incumbents:
    USED.add(trial)
    p = point(trial, track, "incumbent", incumbent=True)
    assert row(trial)["algorithm"] == alg, (trial, alg)
    t = res(trial, track)  # compare STATUS.md's rounded text with the full-precision ledger values
    if abs(t["score"] - float(mdl)) > 0.00005 or abs(t["x"] - float(x)) > 0.0005 or abs(t["y"] - float(y)) > 0.0005:
        NOTES.append(f"STATUS.md text {track}: {mdl}/{x}/{y} vs ledger {p['ratio']}/{p['x']}/{p['y']}")
    if reads != "-" and (p["reads"] is None or abs(t["dict_reads"]["max_entries"] - int(reads)) > 0.5):
        NOTES.append(f"STATUS.md reads {track}: {reads} vs ledger {p['reads']}")
    check(f"STATUS {track} MDL", float(mdl), p["ratio"])
    points.append(p)

# C1 ladder (spec 1.4) on v-l3h0-fp8-b4k. Coder 21: the spec names r1-t0018, whose fp8 rows are
# status gate_failed; r1-t0021 is the re-evaluation under the fixed decode gate with the identical score.
C1_TRACK = "v-l3h0-fp8-b4k"
C1_LADDER = [
    ("per-channel statistics only (solo)", 9, "r1-t0005", 0.8039),
    ("each entry predicted from its nearest earlier entry", 4, "r3-t0002", 0.7698),
    ("references chosen recursively", 15, "r1-t0008", 0.7447),
    ("references coded along their own tree", 17, "r1-t0009", 0.7373),
    ("a per-entry match-quality class (8 classes)", 19, "r1-t0014", 0.7043),
    ("shrink toward the reference", 21, "r1-t0021", 0.6951),
    ("k-medoid references", 23, "r1-t0019", 0.6890),
    ("one stream per tree level", 27, "r1-t0035", 0.6850),
    ("copy-shrink", 30, "r1-t0037", 0.6815),
    ("references = internal nodes of the block's minimum spanning tree", 34, "r1-t0042", 0.6731),
    ("lean tables", 37, "r1-t0045", 0.6725),
    ("every entry in the dictionary (y = 0)", 43, "r1-t0068", 0.6705),
]
SPEC_TRIAL = {"r1-t0021": "r1-t0018"}
c1_rows = []
for step, coder, trial, pinned in C1_LADDER:
    p = point(trial, C1_TRACK, "c1-ladder", step=step)
    assert p["coder"] == coder, (trial, p["coder"], coder)
    if trial in SPEC_TRIAL:
        p["trial_in_spec"] = SPEC_TRIAL[trial]
        p["note"] = f"spec names {SPEC_TRIAL[trial]}, whose fp8 rows are status gate_failed (same score); {trial} is the status-ok re-evaluation"
        NOTES.append(p["note"])
    if coder == 43:
        p["set_aside"] = True
        p["set_aside_note"] = "C1 set this corner aside as stream compression (about 1,490 reads per entry); the ledger incumbent, not the story's end"
    check(f"C1 ladder coder {coder:02d} at 4k", pinned, p["ratio"])
    points.append(p)
    c1_rows.append({k: p[k] for k in {"step", "coder", "name", "ratio", "x", "y", "trial", "verified", "per_sequence"}
                    | ({"trial_in_spec", "note", "set_aside", "set_aside_note"} & p.keys())})
# lean tables at 512 (spec: 0.7237 at 512)
t37_512 = res("r1-t0045", "v-l3h0-fp8-b512")
check("C1 coder 37 at 512", 0.7237, round(t37_512["score"], 5))
c1_rows[10]["ratio_at_512"] = round(t37_512["score"], 5)
# C1 block sizes (coder 50 = 34's big-block twin): 512 / 4k / 16k / 32k
C1_BLOCKS = [(512, "r1-t0045", "v-l3h0-fp8-b512", 0.7237), (4096, "r1-t0042", C1_TRACK, 0.6731),
             (16384, "r4-t0008", "v-l3h0-fp8-b16k", 0.6416), (32768, "r4-t0008", "v-l3h0-fp8-b32k", 0.6294)]
c1_blocks = []
for b, trial, track, pinned in C1_BLOCKS:
    p = point(trial, track, "c1-blocks")
    check(f"C1 block size {b}", pinned, p["ratio"])
    c1_blocks.append({"b": b, "ratio": p["ratio"], "coder": p["coder"], "trial": trial, "track": track, "x": p["x"], "y": p["y"]})
    if b != 4096:
        points.append(p)
# C1's y = 0 incumbents at 16k / 32k (set aside, for completeness of the square)
for track in ("v-l3h0-fp8-b16k", "v-l3h0-fp8-b32k"):
    points.append(point("r4-t0019", track, "c1-y0", set_aside=True))
# baseline and landmarks
base = point("env-t0001", C1_TRACK, "baseline")
check("baseline ratio", 1.0, base["ratio"])
points.append(base)
solo6 = res("env-t0096", "s-layer-b4k-r293")["landmark"]["solo_ratio"]
solo_l3 = res("env-t0001", C1_TRACK)["landmark"]["solo_ratio"]
solo_02 = res("env-t0096", "st02n5-layer-b4k-r293")["landmark"]["solo_ratio"]
check("solo ideal six layers", 0.778, round(solo6, 5))
check("solo ideal L3 h0", 0.7999, round(solo_l3, 5))
landmarks = {
    "baseline": {"x": 0.0, "y": 1.0, "ratio": 1.0, "trial": "env-t0001", "note": "01-baseline, perc = 0: x + y = 1 by construction"},
    "solo_ideal": {"x": 0.0, "y": round(solo6, 5), "ratio": round(solo6, 5), "bits": round(8 * solo6, 3),
                   "note": "per-channel order-0 entropy of the values, all six layers; ledger landmark.solo_ratio of the s-*-b4k screens"},
    "solo_ideal_l3h0": {"ratio": round(solo_l3, 5), "bits": round(8 * solo_l3, 3), "note": "the same ideal for V layer 3 head 0 (C1 tracks)"},
    "solo_ideal_target02_5seq": {"ratio": round(solo_02, 5), "note": "landmark of the st02n5 screens"},
    "solo_coded_l3h0": {"ratio": c1_rows[0]["ratio"], "coder": 9, "trial": "r1-t0005", "note": "best real solo coder, two-number logistic per channel"},
}
# economics inputs (msrEconomics): the light no-tree coder and the tree coder on the layer screen
p129 = res("r25-t0003", "s-layer-b4k-r293")
p121 = res("env-t0096", "s-layer-b4k-r293")
economics_inputs = {
    "hisparse": {"rho": 1.0, "note": "no compression"},
    "solo_ideal": {"rho": round(solo6, 3)},
    "light_no_tree_coder_129_layer": {"rho": round(p129["score"], 4), "w_over_b": round(p129["x"], 4), "delta_share": round(p129["y"], 4), "trial": "r25-t0003"},
    "tree_coder_121_layer": {"rho": round(p121["score"], 4), "w_over_b": round(p121["x"], 4), "delta_share": round(p121["y"], 4), "trial": "env-t0096",
                             "note": "about half the block sits in the dictionary; deltas average 0.11 of raw (empty ones included)"},
    "block_floor_exact_model": {"rho": 0.60, "note": "hypothetical; exact-model bound at 16k (measured-memory.json floors)"},
}
write("measured-points.json", {
    "source": source(NOTES + ["points: ratio/x/y/reads from the ledger row of `trial`; `incumbent` rows are the STATUS.md table of 2026-10-31 06:43 UTC",
                               "verified = not quick and verification.isolated; every_entry = dict_reads counted for every entry (post-2026-10-31 rule); reads null where the ledger has none",
                               "C1 points are V layer 3 head 0 only (split 'head' = one head), no read budget; C2 points are all six layers",
                               "scores from different tracks read different blocks and cannot be subtracted"]),
    "points": points, "landmarks": landmarks, "economics_inputs": economics_inputs})

# ================================================================ 2. ladders
C2_TRACK = "s-layer-b4k-r293"
C2_LADDER = [
    (71, "r7-t0002", "the tree coder of C1 on both heads (no linear prediction)", 0.69018),
    (71, "r7-t0001", "+ prediction from the other head, 16 terms per channel", 0.67746),
    (74, "r7-t0003", "terms chosen one at a time until a term stops paying", 0.66641),
    (80, "r11-t0001", "any earlier channel may be a term, either head", 0.65620),
    (89, "r11-t0003", "positions stored more cheaply", 0.64704),
    (102, "r11-t0002", "laid out along tree paths (reads one path, not whole levels)", 0.64494),
    (111, "r22-t0001", "tree built on distance after prediction", 0.64352),
    (114, "r22-t0003", "weights rounded by what each rounding costs in bits", 0.64167),
    (126, "r20-t0001", "decoder blends ancestors' errors, no byte sent (on 102)", 0.64074),
    (115, "r22-t0005", "head 0 first then head 1, no stored order", 0.64003),
    (121, "env-t0096", "115 + refit slopes and tree", 0.63639),
]
c2_rows = []
for coder, trial, what, pinned in C2_LADDER:
    p = point(trial, C2_TRACK, "c2-ladder")
    assert p["coder"] == coder, (trial, p["coder"])
    check(f"C2 ladder coder {coder} ({trial})", pinned, p["ratio"])
    rr = {"coder": coder, "name": p["name"], "what": what, "ratio": p["ratio"], "x": p["x"], "y": p["y"], "trial": trial,
          "verified": p["verified"], "per_sequence": p["per_sequence"], "reads": p["reads"], "every_entry": p["every_entry"]}
    if coder == 126:
        rr["side_branch"] = "off 102, not a rung under 115/121"
    c2_rows.append(rr)
# 121 vs 102 on five sequences of target 02
T5 = "st02n5-layer-b4k-r293"
r121 = res("env-t0096", T5)
r102 = res("r24-t0002", T5)
ps121, ps102 = per_seq(r121), per_seq(r102)
diffs = {k: round(ps121[k] - ps102[k], 5) for k in ps121}
dvals = list(diffs.values())
check("121 on 5 seq", 0.62970, round(r121["score"], 5))
check("102 on 5 seq", 0.63848, round(r102["score"], 5))
check("121-102 mean diff", -0.00878, round(statistics.mean(dvals), 5))
for k, v in zip(sorted(diffs), [-0.00883, -0.00887, -0.00861, -0.00874, -0.00886]):
    check(f"121-102 diff seq {k}", v, diffs[k])
check("121-102 diff SD", 0.0001, round(sd(dvals), 5))
check("121 reads mean (5 seq)", 120, r121["dict_reads"]["mean_entries"], tol=0.5)
check("102 reads mean (5 seq)", 103, r102["dict_reads"]["mean_entries"], tol=0.5)
five = {
    "track": T5, "n_blocks": r121["n_blocks"], "n_entries": r121["n_entries"], "sequences": sorted(ps121),
    "coder_121": {"trial": "env-t0096", "ratio": round(r121["score"], 5), "per_sequence": ps121, "reads_mean": round(r121["dict_reads"]["mean_entries"], 1),
                  "reads_every_entry": True, "verified": verified("env-t0096", T5)},
    "coder_102": {"trial": "r24-t0002", "ratio": round(r102["score"], 5), "per_sequence": ps102, "reads_mean": round(r102["dict_reads"]["mean_entries"], 1),
                  "reads_every_entry": False, "verified": verified("r24-t0002", T5)},
    "paired_difference": {"per_sequence": diffs, "mean": round(statistics.mean(dvals), 5), "sd": round(sd(dvals), 5),
                          "grade_in_ledger": (row("env-t0007")["tracks"][T5].get("vs") or {}).get("grade"), "graded_trial": "env-t0007 (same bytes as env-t0096, reads sampled)"},
}
# C2 block sizes (different screens)
C2_BLOCKS = [(512, "env-t0010", "s-layer-b512-r293", 0.68938), (4096, "env-t0096", C2_TRACK, 0.63639), (16384, "env-t0097", "s-layer-b16k-r293", 0.61768)]
c2_blocks = []
for b, trial, track, pinned in C2_BLOCKS:
    p = point(trial, track, "c2-blocks")
    check(f"C2 block size {b}", pinned, p["ratio"])
    c2_blocks.append({"b": b, "ratio": p["ratio"], "coder": p["coder"], "trial": trial, "track": track, "x": p["x"], "y": p["y"], "reads": p["reads"]})
write("measured-ladders.json", {
    "source": source(["c1: V layer 3 head 0, blocks of 4096, no read budget, 2 dev sequences of target 03; track " + C1_TRACK,
                      "c2: " + C2_TRACK + " (one layer's entry, 512 B, blocks of 4096, budget 293, 72 blocks, 2 dev sequences); every row isolated-verified",
                      "blocks.c2 are three different screens (180 / 72 / 36 blocks): the shape is solid, the third decimal is not",
                      "C1 and C2 numbers are different slices; 0.6731 (C1 4k) and 0.674 (C2 head 4k) look alike by coincidence"]),
    "c1": {"track": C1_TRACK, "rows": c1_rows, "landmarks": {"solo_ideal": landmarks["solo_ideal_l3h0"]["ratio"], "baseline": 1.0}},
    "c2": {"track": C2_TRACK, "rows": c2_rows, "landmarks": {"solo_ideal": landmarks["solo_ideal"]["ratio"], "baseline": 1.0}, "five_sequences": five},
    "blocks": {"c1": {"track_family": "v-l3h0-fp8", "points": c1_blocks,
                      "y0_incumbents": [{"b": BLOCK[b], "ratio": round(res("r4-t0019", f"v-l3h0-fp8-b{b}")["score"], 5), "trial": "r4-t0019"} for b in ("16k", "32k")]
                      + [{"b": BLOCK[b], "ratio": round(res("r1-t0068", f"v-l3h0-fp8-b{b}")["score"], 5), "trial": "r1-t0068"} for b in ("512", "4k")]},
               "c2": {"split": "layer", "budget": 293, "points": c2_blocks},
               "floor_whole_sequence_exact_model": PAGES["floors"]["whole_sequence"]["ratio"],
               "floor_receipt": PAGES["floors"]["receipt"]},
    "c1_extras": hand("c1_extras")})

# ================================================================ 3. splits
# adjacent tokens, like for like (coder 62, same trial r12-t0004, quick): tok2 / tok4 vs its own layer score
t62 = row("r12-t0004")["tracks"]
adj = {k: round(t62[f"s-{k}-b4k-u"]["score"], 5) for k in ("layer", "tok2", "tok4", "token")}
check("tok2 minus layer (same coder)", 0.037, round(adj["tok2"] - adj["layer"], 5))
check("tok4 minus layer (same coder)", 0.063, round(adj["tok4"] - adj["layer"], 5))
check("coder 62 own layer score", 0.6896, adj["layer"])
# coder 129 by split (ledger, isolated)
c129 = []
for split, trial in (("head", "r25-t0003"), ("layer", "r25-t0003"), ("pair", "r25-t0003"), ("regime", "r25-t0003"),
                     ("triple", "r25-t0003"), ("token", "r25-t0004")):
    p = point(trial, f"s-{split}-b4k-r293", "c129")
    c129.append({"split": split, "values_per_entry": {"head": 256, "layer": 512, "pair": 1024, "regime": 1536, "triple": 1536, "token": 3072}[split],
                 "ratio": p["ratio"], "x": p["x"], "y": p["y"], "trial": trial, "verified": p["verified"], "reads": p["reads"]})
for split, pinned in (("head", 0.7348), ("layer", 0.6863), ("pair", 0.6696), ("regime", 0.6667), ("triple", 0.6652), ("token", 0.6622)):
    check(f"coder 129 {split}", pinned, next(c["ratio"] for c in c129 if c["split"] == split))
c129_col = point("env-t0095", "s-column-b4k-r293", "c129")
c129.insert(5, {"split": "column", "values_per_entry": 1536, "ratio": c129_col["ratio"], "x": c129_col["x"], "y": c129_col["y"], "trial": "env-t0095",
                "verified": c129_col["verified"], "reads": c129_col["reads"]})
r102s = res("r11-t0002", C2_TRACK)["score"]
check("129 vs 102 on layer", 0.041, round(p129["score"] - r102s, 5))
# codebooks: RQ / PQ real coders (128-quant-cells) against their own prediction-only control
rq = row("r26-t0011")["tracks"][C2_TRACK]
rq_ctl = row("r26-t0002")["tracks"][C2_TRACK]
pq = row("r26-t0008")["tracks"][C2_TRACK]
check("RQ delta vs own control", -0.0029, round(rq["score"] - rq_ctl["score"], 5))
check("PQ delta vs own control", -0.0017, round(pq["score"] - rq_ctl["score"], 5))
codebooks = hand("codebooks")
codebooks["ledger"] = {
    "track": C2_TRACK,
    "control_prediction_only_128": {"trial": "r26-t0002", "ratio": round(rq_ctl["score"], 5), "verified": False, "status": rq_ctl.get("status")},
    "rq_no_tree_128": {"trial": "r26-t0011", "ratio": round(rq["score"], 5), "verified": verified("r26-t0011", C2_TRACK), "delta": round(rq["score"] - rq_ctl["score"], 5)},
    "pq_no_tree_128": {"trial": "r26-t0008", "ratio": round(pq["score"], 5), "verified": False, "delta": round(pq["score"] - rq_ctl["score"], 5)},
    "tree_102": {"trial": "r11-t0002", "ratio": round(r102s, 5)},
    "note": "the spec's msrCast bar '129 + RQ 0.6834' is 0.6863 - 0.0029, a derived number: RQ's -0.0029 was measured on coder 128's own prediction-only control (0.69716 -> 0.69421), not on coder 129",
}
cast = {"track": C2_TRACK, "solo_ideal": landmarks["solo_ideal"]["ratio"], "c129_prediction_only": round(p129["score"], 5),
        "c129_plus_rq_derived": round(p129["score"] + (rq["score"] - rq_ctl["score"]), 5), "tree_102": round(r102s, 5),
        "tree_plus_prediction_121": round(p121["score"], 5), "fixed_rotation_penalty_bits": PAGES["codebooks"]["fixed_rotations"]["penalty_bits_per_element"],
        "note": "c129_plus_rq_derived is derived (see codebooks.ledger.note); mark it as such"}
write("measured-splits.json", {
    "source": source(["same_window, shuffle, free_model, overlap, heads_geometry, rule_portability and the page parts of codebooks are hand-entered with receipts",
                      "adjacent_tokens and coder_129_by_split are ledger rows; the tok2/tok4 loss is like for like (same trial, same settings of coder 62, quick)"]),
    "same_window": hand("same_window"),
    "adjacent_tokens": {"trial": "r12-t0004", "coder": 62, "grade": "quick (not isolated-verified), same settings on every split", "ratios": adj,
                        "loss_vs_layer": {"tok2": round(adj["tok2"] - adj["layer"], 5), "tok4": round(adj["tok4"] - adj["layer"], 5)},
                        "note": "the article compares against 0.677 (r12-t0001, a differently configured 62); like for like the loss is +0.037 / +0.063"},
    "coder_129_by_split": {"rows": c129, "vs_102_on_layer": round(p129["score"] - r102s, 5), "segments": "14 of 14 worse",
                           "note": "no tree, no reference: x is 0.01-0.04 and meaningful; different screens per split, good to about 0.005"},
    "shuffle": hand("shuffle"), "free_model": hand("free_model"), "overlap": hand("overlap"), "heads_geometry": hand("heads_geometry"),
    "rule_portability": hand("rule_portability"), "codebooks": codebooks, "cast": cast})

# ================================================================ 4. reads
recheck = json.load(open(os.path.join(REPO, "research/agents/env/pages/reads-recheck.json")))
EVERY = [("head, 4096, budget 293", "s-head-b4k-r293", "env-t0011", 126, 0.67408, (68, 123, 171)),
         ("layer, 4096, 293", C2_TRACK, "env-t0096", 121, 0.63639, (120, 184, 226)),
         ("token, 4096, 293", "s-token-b4k-r293", "env-t0093", 116, 0.63879, (89, 114, 132)),
         ("layer, 4096, 293, 5 seq of target 02", T5, "env-t0096", 121, 0.62970, (120, 182, 247)),
         ("token, 4096, 293, 5 seq of target 02", "st02n5-token-b4k-r293", "env-t0093", 116, 0.62910, (90, 120, 136)),
         ("layer, 16384, 293", "s-layer-b16k-r293", "env-t0097", 120, 0.61768, (141, 190, 229)),
         ("layer, 512, 293", "s-layer-b512-r293", "env-t0010", 113, 0.68938, (159, 249, 257)),
         ("head, 512, 293", "s-head-b512-r293", "env-t0009", 109, 0.71884, (51, 142, 187)),
         ("layer, 4096, 137", "s-layer-b4k-r137", "env-t0089", 97, 0.65980, (64, 101, 129))]
every_rows = []
total_entries = 0
for label, track, trial, coder, pinned, (pm, p99, pmax) in EVERY:
    p = point(trial, track, "every-entry")
    assert p["coder"] == coder and p["every_entry"], (trial, track)
    check(f"every-entry {label} ratio", pinned, p["ratio"])
    check(f"every-entry {label} reads mean", pm, p["reads"]["mean"], tol=0.5)
    check(f"every-entry {label} reads p99", p99, p["reads"]["p99"], tol=0.5)
    check(f"every-entry {label} reads max", pmax, p["reads"]["max"], tol=0.5)
    # cross-check against reads-recheck.json
    rc = [e for e in recheck["tracks"].get(track, []) if e.get("new_trial") == trial]
    agree = bool(rc) and abs(rc[0]["reads"]["mean_entries"] - p["reads"]["mean"]) < 0.1 and abs(rc[0]["reads"]["max_entries"] - p["reads"]["max"]) < 0.1
    if not agree:
        NOTES.append(f"reads-recheck.json disagrees with ledger dict_reads for {trial} {track}")
    every_rows.append({"screen": label, **{k: p[k] for k in ("track", "split", "b", "budget", "n_sequences", "coder", "name", "ratio", "x", "y", "reads", "trial", "verified", "n_blocks", "n_entries")},
                       "worst_over_mean": round(p["reads"]["max"] / p["reads"]["mean"], 2), "reads_from": "ledger dict_reads (every_entry: true); equals reads-recheck.json" if agree else "ledger dict_reads"})
    total_entries += p["n_entries"]
# the whole recount: 19 tracks, sampled vs every-entry
recount = []
for track, lst in recheck["tracks"].items():
    for e in lst:
        rd = e.get("reads") or {}
        USED.add(e["trial"])
        if e.get("new_trial"):
            USED.add(e["new_trial"])
        recount.append({"track": track, "coder": int(e["algorithm"].split("-")[0]), "trial_sampled": e["trial"], "trial_every_entry": e.get("new_trial"),
                        "status": e.get("status"), "ratio": round(e["score"], 5), "sampled": {"mean": round(e["sample_mean"], 1), "max": round(e["sample_max"], 1)},
                        "every_entry": ({"mean": round(rd["mean_entries"], 1), "p99": rd.get("p99_entries"), "max": round(rd["max_entries"], 1)} if rd.get("mean_entries") is not None else None),
                        "max_over_sampled_max": (round(rd["max_entries"] / e["sample_max"], 3) if rd.get("max_entries") else None)})
n_recount_entries = sum((e.get("reads") or {}).get("samples") or 0 for lst in recheck["tracks"].values() for e in lst)
r97 = res("env-t0089", "s-layer-b4k-r137")["score"]
check("budget 137 cost on layer (97 - 121)", 0.0234, round(r97 - p121["score"], 5))
xsm = hand("x_stopped_mattering")
xsm["ledger"] = {
    "coder_109_at_x1": [{"track": tk, "trial": tr, "ratio": round(res(tr, tk)["score"], 5), "x": round(res(tr, tk)["x"], 4), "y": round(res(tr, tk)["y"], 4),
                         "reads_max": (reads_of(res(tr, tk))[0] or {}).get("max")} for tk, tr in (("s-head-b4k-u", "r6-t0004"), ("s-head-b512-r293", "env-t0009"))],
    "coder_91_at_x056": {"track": "s-head-b4k-r293", "trial": "r6-t0003", "ratio": round(res("r6-t0003", "s-head-b4k-r293")["score"], 5), "x": round(res("r6-t0003", "s-head-b4k-r293")["x"], 4)},
    "delta_size_121_bytes_of_512": r121.get("delta_size"), "delta_size_116_bytes_of_3072": res("env-t0093", "st02n5-token-b4k-r293").get("delta_size"),
    "note": "delta_size p10/p50 = 0 for 121: more than half of its deltas are empty over 745,472 entries",
}
write("measured-reads.json", {
    "source": source(["every_entry_table: mean/p99/max from the ledger dict_reads of the re-measured trial (every_entry: true), cross-checked against reads-recheck.json",
                      "recount: all entries of reads-recheck.json (sampled 8-per-block maxima vs every entry counted cold)",
                      "reads_curve and x_stopped_mattering page parts are hand-entered with receipts"]),
    "budgets": [137, 293, 1103], "budget_unit": "one layer entry (512 B) of distinct dictionary bytes touched by one cold decode",
    "every_entry_table": every_rows, "entries_counted_in_table": total_entries, "entries_counted_in_recheck": n_recount_entries,
    "budget_137_cost_on_layer": {"coder_97": round(r97, 5), "coder_121": round(p121["score"], 5), "delta": round(r97 - p121["score"], 5),
                                 "note": "121 does not fit 137 (worst entry 226); 97 does (worst 129)"},
    "recount": recount, "rule_change": hand("reads_rule_change"), "reads_curve": hand("reads_curve"), "x_stopped_mattering": xsm,
    "block_size": {"c2": c2_blocks, "c1": c1_blocks, "scaling": hand("block_scaling"), "floors": hand("floors")}})

# ================================================================ 5. memory
write("measured-memory.json", {
    "source": source(["everything here is hand-entered from r23's and r9's pages (one window / 4 blocks / exact models), with receipts; the only ledger number is coder 102's screen score"]),
    "memory_table": hand("memory_table"), "replay": hand("replay"), "weights_rule": hand("weights_rule"),
    "variance_and_sharing": hand("variance_and_sharing"), "floors": hand("floors"),
    "coder_102_screen": {"track": C2_TRACK, "trial": "r11-t0002", "ratio": round(r102s, 5), "bits": round(8 * r102s, 3)},
    "human_decisions": ["read budget for every single entry", "delta lengths not counted", "a shared table is legitimate but no coder may use one until an independent dataset exists"]})

# ================================================================ 6. noise
def pair(a_trial, b_trial, track):
    a, b = res(a_trial, track), res(b_trial, track)
    pa, pb = per_seq(a), per_seq(b)
    d = {k: round(pa[k] - pb[k], 5) for k in pa}
    vals = list(d.values())
    return {"track": track, "a": {"trial": a_trial, "coder": coder_of(a_trial)[0], "ratio": round(a["score"], 5)},
            "b": {"trial": b_trial, "coder": coder_of(b_trial)[0], "ratio": round(b["score"], 5)},
            "delta": round(a["score"] - b["score"], 5), "per_sequence": d if len(vals) > 2 else None,
            "sd": round(sd(vals), 5) if len(vals) > 2 else None}


ESC = [("102 vs 89", "r11-t0002", "r11-t0003", "r24-t0002", "r12-t0007", (-0.00210, -0.00212, 0.00006)),
       ("89 vs 71", "r11-t0003", "r7-t0001", "r12-t0007", "r24-t0003", (-0.0305, -0.0315, 0.0005)),
       ("100 vs 89", "env-t0013", "r11-t0003", "r24-t0001", "r12-t0007", (0.0018, 0.0020, None)),
       ("121 vs 102", "env-t0096", "r11-t0002", "env-t0096", "r24-t0002", (-0.0086, -0.0088, 0.0001))]
escalation = []
for label, sa, sb, fa, fb, (ps, pf, psd) in ESC:
    s, f5 = pair(sa, sb, C2_TRACK), pair(fa, fb, T5)
    check(f"escalation {label} screen", ps, s["delta"])
    check(f"escalation {label} 5 seq", pf, round(statistics.mean(f5["per_sequence"].values()), 5))
    if psd is not None:
        check(f"escalation {label} 5-seq SD", psd, f5["sd"])
    escalation.append({"pair": label, "screen": s, "five_sequences": f5, "held": (s["delta"] < 0) == (f5["delta"] < 0)})
# the trap
r94tok = res("r8-t0003", "s-token-b4k-r293")["score"]
check("trap: layer screen 102", 0.6449, round(r102s, 5))
check("trap: token screen 94", 0.6461, round(r94tok, 5))
# between-sequence SD from the ledger (5 and 10 sequences) vs the page's 0.012 over 20
bs = {"coder_121_5_seq": round(sd(ps121.values()), 5), "coder_102_5_seq": round(sd(ps102.values()), 5),
      "coder_94_10_seq_token": round(sd(per_seq(res("env-t0094", "st02n10-token-b4k-r293")).values()), 5),
      "coder_62_5_seq_head": round(sd(per_seq(res("r12-t0006", "st02n5-head-b4k-u")).values()), 5)}
dups = sorted(k for k, r in ROWS.items() if k.startswith("env-t00") and 14 <= int(k[6:]) <= 87)
htdr = hand("how_the_day_ran")
htdr["duplicate_rows_counted"] = len(dups)
check("duplicate ledger rows env-t0014..87", 74, len(dups), tol=0)
write("measured-noise.json", {
    "source": source(["five_sequences, escalation, trap scores and between_sequence_sd_ledger are computed from ledger per_sequence ratios (sample SD, n-1)",
                      "between-sequence SD 0.012 is the page's figure over 20 sequences (hand-entered); the 5-sequence ledger SDs are smaller (0.007) because 5 sequences is a small sample",
                      "the screen deltas are two-sequence screens; the five-sequence deltas are st02n5-layer-b4k-r293, all isolated-verified"]),
    "five_sequences": five, "between_sequence_sd_ledger": bs, "escalation": escalation,
    "trap": {"layer_screen": {"coder": 102, "trial": "r11-t0002", "ratio": round(r102s, 5)}, "token_screen": {"coder": 94, "trial": "r8-t0003", "ratio": round(r94tok, 5)},
             "same_window_token_minus_layer": PAGES["same_window"]["joins"][1]["delta"], "agree": PAGES["same_window"]["joins"][1]["agree"],
             "token_screen_harder_by": PAGES["noise"]["screen_offset_from_full_track"]["token"],
             "note": "scores from two screens read different blocks and cannot be subtracted"},
    "page_numbers": hand("noise"), "how_the_day_ran": htdr,
    "campaign_scale": {"ledger_trials": {c: sum(1 for r in ROWS.values() if r.get("campaign") == c) for c in ("C1", "C2")},
                       "agents_with_ledgers": len(AGENTS), "coders": len([d for d in glob.glob(os.path.join(REPO, "algorithms/[0-9]*")) if os.path.isdir(d)]),
                       "note": "C2 169 trials include the 74 duplicate rows"}})

# ================================================================ 7. time
r126, r102b = res("r20-t0001", C2_TRACK), res("r11-t0002", C2_TRACK)
check("coder 126 on layer", 0.64074, round(r126["score"], 5))
write("measured-time.json", {
    "source": source(["flac, references_point, neural_network, values_not_bits are hand-entered from pages (bounds / exact models), with receipts",
                      "coder_126 and the b = 512 rows are ledger numbers"]),
    "flac": hand("flac"), "references_point": hand("references_point"), "neural_network": hand("neural_network"),
    "coder_126": {"track": C2_TRACK, "ratio": round(r126["score"], 5), "vs_102": round(r102b["score"], 5), "delta": round(r126["score"] - r102b["score"], 5),
                  "trial": "r20-t0001", "blocks": "72 of 72", "verified": verified("r20-t0001", C2_TRACK), "what": "each entry blends its tree ancestors' errors while decoding, no byte sent"},
    "b512_learned_vs_paid": {**hand("b512_learned_vs_paid"), "coder_113_ledger": {"track": "s-layer-b512-r293", "trial": "env-t0010", "ratio": c2_blocks[0]["ratio"], "reads": c2_blocks[0]["reads"]}},
    "values_not_bits": hand("values_not_bits")})

# ================================================================ check table
print("\npinned (spec section 1) vs extracted (ledger):")
bad = 0
for label, pinned, extracted, ok in CHECKS:
    flag = "ok      " if ok else "MISMATCH"
    bad += not ok
    print(f"  {flag} {label:<58} {pinned!s:>10} {extracted!s:>12}")
print(f"{len(CHECKS)} checks, {bad} mismatch(es)")
if NOTES:
    print("notes:")
    for n in NOTES:
        print("  -", n)
sys.exit(1 if bad and os.environ.get("MEASURED_STRICT") else 0)

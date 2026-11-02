# Figure notes: Part I (tiny-files) and Part II pages 1–12 (school, first half)

Left by the vocabulary retrofit of `content/01-tiny-files/` and `content/02-school/01…12`. No new builders
are needed; the only retired word in a UI label of these Parts is "model" in `siArith`.

| builder | file | label says now | should say |
|---|---|---|---|
| `siArith` | `figures/school-info.js` (≈ line 508) | segmented control labelled `model` with options `summer model` / `year model` | control labelled `probability table`, options `summer's table` / `year's table` |
| `siArith` | `figures/school-info.js` (≈ line 513) | KPI tile `this model` | `this table` |
| `siArith` | `figures/school-info.js` (≈ line 562) | readout `bits so far (summer model)` / `(year model)` | `bits so far (summer's table)` / `(year's table)` |

The prose of II.8 (`school-arithmetic`) already says "summer's table" and "the year's table" and describes
the control as "Switch between summer's table and the year's table"; the figure should match.

`figures/tiny.js`: no retired words in any label (the `Object.entries` hits of the word checker are code).

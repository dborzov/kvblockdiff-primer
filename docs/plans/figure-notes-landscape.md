# Figure notes for Part III (`figures/landscape.js`)

The pages of `content/03-landscape/` reuse every builder of `figures/landscape.js` unchanged. Their UI
labels still carry retired words; each page's caption says so with an `<!-- old-words -->` line until the
JS is retrofitted. What to change, builder by builder. Vocabulary: `docs/style/terminology.md`.

## Label changes (same builders, same ids)

| builder | where | says now | should say |
|---|---|---|---|
| file header comment | top of file | "Where things stand … the KV cache … reference numbers of III.10" | "How an LLM reads its memory … the orchard … the Pin (III.11)" |
| `REF` comment | top of file | "the reference setting (III.10)", "bytes per entry", "selections per layer per step" | "the Pin (III.11)", "bytes per row (one token, one layer)", "picks per layer per step" |
| `decodeGrid` | stepper labels | "climb the 4 layers" (fine); hover "the cell this token left" (fine) | no change needed; optionally "KV layer" for "layer" |
| `attentionToy` | — | element 0 / element 1 (already our words) | no change |
| `entryAnatomy` | model picker | seg labels "toy model", "Qwen3.5-2B", "GLM-5.1-class"; control name "model" | "the toy", "Qwen3.5-2B", "GLM-5.1-class"; control name "the LLM" |
| `entryAnatomy` | `MODELS.*.name/note` | "the toy of III.2", "only its 6 full-attention layers keep entries", "one latent vector of ≈ 640 numbers per token per layer" | "the toy of III.2", "only its 6 KV layers keep rows", "one latent of ≈ 640 elements per token per layer" |
| `entryAnatomy` | kpi tiles | "numbers per entry", "bytes per entry \ve", "entries per token · one per layer", "bytes per token · all layers" | "elements per row", "bytes per row (one token, one layer)", "rows per token · one per KV layer", "bytes per token · all KV layers" |
| `entryAnatomy` | strip aria-label, hover | "One entry of …: N numbers", "N numbers × 8 bits" | "One row of …: N elements", "N elements × 8 bits" |
| `entryAnatomy` | the Qwen row | counts keys and values together (1 024 elements, 1 KB) | keep, but add a third tile or note "values alone: 512 B" so it matches the page's `v[token_pos_id, layer_id]` = 512 B; ideally a switch "keys and values / values only" |
| `ropeSpin` | axis labels, read-out | "key channel 2c", "key channel 2c+1", "spread of channel 2c" | "key element 2c", "key element 2c+1", "spread of element 2c" |
| `readingGrid` | legend, plot, read-out | "entries stored (= read per step by dense attention)", "entries read per step by sparse attention", ylabel "entries", "Stored and read entries", "read the k picks" (fine) | "rows stored (= read per step by dense attention)", "picks read per step by sparse attention", ylabel "rows", "Stored rows and picks read" |
| `memoryWall` | meters, tiles, sliders | "if every history stays on the GPU", "if every step fetches all selections", "KV per request", "traffic per request", "requests that fit in 30 GB", "requests a 50 GB/s link feeds", slider "requests per GPU", seg "selections per layer per step" | "if every orchard stays on the GPU", "if every step fetches every pick", "orchard per sequence", "traffic per sequence", "sequences that fit in 30 GB", "sequences a 50 GB/s link feeds", "sequences per GPU", "picks per layer per step (k)" |
| `hisparseSystem` | hover text, notes | "entry at position p", "the history: 16 entries", "every entry of the request", "carries one raw entry per miss", "picks k positions per layer per step", "reads the selected entries in place", legend "selected at this step" | "row at position p", "the orchard: 16 rows", "every row of the sequence", "carries one raw pick per miss", "names k picks per layer per step", "reads the picks in place", legend "picked at this step" |
| `toyTrace` | stepper labels, legend | "the indexer selects …", "(least recently used, not selected) is evicted", legend "selected now", tile "hot-cache memory" (fine) | "the indexer picks …", "(least recently used, not picked) is evicted", legend "picked now" |
| `toyTrace` | tile sub-labels | "at \ve = 640 B" (the Pin) | keep, but say "on the Pin"; or read `KV.ref('e')` so the tile follows the setting switch (512 B on the Bench) |
| `louisRaster` | legend, read-out | "re-selected from the step before" | "re-picked from the step before" |
| `reuseCurve` | axis label, read-out | "hot-cache slots B (per layer, per request)", "GPU memory per request" | "hot-cache slots B (per layer, per sequence)", "GPU memory per sequence" |
| `refSetting` | whole board | "the model", "sparse layers", "selections per layer per step", "numbers per entry", "entry size", "bytes per token", "the cache", "miss rate, top-k only", "GPU memory for KV, per GPU", "KV history of one 100K request", "hot cache per request" | "the LLM", "KV layers", "picks per layer per step", "elements per row", "bytes per row (one token, one layer)", "bytes per token, all KV layers", "the hot cache", "miss rate, current picks only", "GPU memory for orchards, per GPU", "orchard of one 100K-token sequence", "hot cache per sequence" |
| `derivedNumbers` | legend, chains, axis, read-out | "requests the link can feed", "requests the GPU memory can hold", ylabel "requests per GPU", chain chips "… = N requests", read-out "requests per GPU" | "sequences …" throughout |
| `deadlineWindow` | — | labels use "link", "decoder", "window" | no change |

## A new or moved builder for III.11

`landscape-reference-settings` currently shows `refSetting`, which is the Pin alone with an 8-bit/BF16
switch. The page plan asks for both settings side by side, from `data/settings.yaml`. The old XII.7 page had
exactly that figure, `rngSettings` in `figures/range.js` (two columns, one row per key, "not measured"
cells, derived rows computed live, a button that flips the pill). Two ways to get it:

1. add `range` to Part III's `figs:` in `data/parts.yaml` and use `::: figure fig-landscape-settings rngSettings wide`; or
2. port `rngSettings` into `figures/landscape.js` as `FIG.settingsCards` (preferred: Part III should not
   load `range.js` for one builder).

Either way its labels need the same word changes as `refSetting` above ("entry" → row, "request" →
sequence, "KV" → orchard, "block" → stretch). When it exists, III.11 should show it in place of
`refSetting` (or keep `refSetting` as a second figure for the 8-bit/BF16 point).

## Builders Part III no longer uses

None. All thirteen builders of `figures/landscape.js` are referenced by a page of Part III (`decodeGrid`,
`attentionToy`, `entryAnatomy`, `ropeSpin`, `readingGrid`, `memoryWall`, `hisparseSystem`, `toyTrace`,
`louisRaster`, `reuseCurve`, `refSetting`, `derivedNumbers`, `deadlineWindow`). Figure ids on the pages:
`fig-landscape-decode`, `-attention`, `-row` (was `-entry`), `-rope`, `-reading`, `-wall`, `-system`,
`-trace`, `-louis`, `-reuse`, `-pin` (was `-ref`), `-walls`, `-deadline`. Other Parts that linked
`[[#fig-landscape-entry]]` or `[[#fig-landscape-ref]]` should use the new ids.

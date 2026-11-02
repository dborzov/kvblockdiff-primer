# Figure notes: Part IX (Papers)

Builders reused unchanged from `figures/papers-a.js` and `figures/papers-b.js`. The captions on the pages
use the site's words; the UI labels inside the builders still use retired words. Each row says what a label
says now and what it should say. No new builders are needed. Figure ids on the pages are prefixed
`fig-papers-`.

## figures/papers-a.js

| builder | page | label now | should say |
|---|---|---|---|
| `paHisparsePoints` | IX.2 | `hot-cache size B (slots per layer)` | keep; `B = k: keep only the current picks` keep |
| `paSelectors` | IX.3 | seg option `'CSA'` | `'DeepSeek-V4'` (the squeezed-row selector) |
| `paSelectors` | IX.3 | `'8 single tokens'` | `'8 single positions'` |
| `paSelectors` | IX.3 | `'2 pages of 4 tokens (scored by their best member)'` | `'2 stretches of 4 positions (scored by their best member)'` |
| `paSelectors` | IX.3 | `'2 blocks of 4 tokens (scored by a summary)'` | `'2 runs of 4 positions (scored by a summary)'` |
| `paSelectors` | IX.3 | `'2 merged entries (4 tokens blended into each)'` | `'2 squeezed rows (4 tokens blended into each)'` |
| `paSelectors` | IX.3 | band label `` `block ${b}` `` | `` `stretch ${b}` `` |
| `paSelectors` | IX.3 | readout `'16-position blocks touched'` | `'16-position stretches touched'` |
| `paSelectors` | IX.3 | (optional) add a fifth mode `'GLM-5.1'`: DSA's picks shared by a group of layers; the toy draws one layer, so this could be a note in the legend rather than a mode | — |
| `paEscapes` | IX.4 | button `'outlier channel'` | `'outlier furrow'` |
| `paEscapes` | IX.4 | kpi `'ratio, ideal coder'` | `'ratio, ideal entropy coder'` |
| `paEscapes` | IX.4 | comment: "eight bell-shaped channels" | "eight bell-shaped furrows" (comment only) |
| `paFloatRatios` | IX.5 | legend `'entropy-coded exponent'`, `'fixed-length exponent code'` | keep |
| `paFloatRatios` | IX.5 | legend `'other float coder'` | `'other float compressor'` |
| `paFloatRatios` | IX.5 | legend `'our calculation (ideal coder, toy data)'` | `'our calculation (ideal entropy coder, toy data)'` |
| `paFloatRatios` | IX.5 | plot label `'Compression ratios of lossless float coders on one BF16 KV workload'` | `'Compression ratios of lossless float compressors on one BF16 orchard workload'` |
| `paFloatRatios` | IX.5 | tooltip source text `'s codec comparison table …'` | `'s compressor comparison table …'` |
| `paFloatRatios` | IX.5 | row name `'toy KV mix (V.4)'` | `'toy orchard mix (IX.4)'` (page number changed: Part V became Part IX) |
| `paVideoLayout` | IX.6 | diagram label `'KV-Codec pipeline: KV cache, rounding, frames, prediction, decoding'` | `'KVFetcher pipeline: the orchard, rounding, frames, prediction, decoding'` |
| `paVideoLayout` | IX.6 | step 1 `'The KV cache of a stored prefix: three layers (sheets) × 8 tokens (columns) × 8 channels (rows). Shades are values.'` | `'The orchard of a stored prefix: three layers (sheets) × 8 tokens (columns) × 8 elements (rows). Shades are values.'` |
| `paVideoLayout` | IX.6 | step 2 `'… (its 8 channels as a 4 × 2 picture) …'` | `'… (its 8 elements as a 4 × 2 picture) …'` |
| `paVideoLayout` | IX.6 | step 3 `'The video coder predicts each frame … neighbouring channels of the same token …'` | `'The video compressor predicts each frame … neighbouring elements of the same token …'` |
| `paVideoLayout` | IX.6 | step 4 `'… a whole chunk at a time (about 10,000 tokens) …'` | `'… a whole run at a time (about 10 000 tokens) …'` |
| `paVideoLayout` | IX.6 | axis text `'channels'` | `'elements'` |
| `paVideoLayout` | IX.6 | annotation `'decoded together, as one video chunk'` | `'decoded together, as one video run'` |
| `paSlepianWolf` | IX.13 | — | no retired words seen; keep |

## figures/papers-b.js

| builder | page | label now | should say |
|---|---|---|---|
| `pbKiviAxis` | IX.7 | seg `'channel'` / `'one ruler per channel'` | `'furrow'` / `'one ruler per furrow'` |
| `pbKiviAxis` | IX.7 | seg `'token'` / `'one ruler per token'` | `'cherry'` / `'one ruler per cherry'` |
| `pbKiviAxis` | IX.7 | diagram label `'A toy table of 12 tokens by 8 channels …'` | `'A toy table of 12 tokens by 8 elements …'` |
| `pbKiviAxis` | IX.7 | hover `` `token t${t}, channel c${c}` `` | `` `token t${t}, element e${c}` `` |
| `pbKiviAxis` | IX.7 | annot `'outlines: each column shares one ruler'` / `'… each row …'` | `'outlines: each furrow shares one ruler'` / `'outlines: each cherry shares one ruler'` |
| `pbKiviAxis` | IX.7 | readout `'small channels'` / `'big channels'` | `'small furrows'` / `'big furrows'` |
| `pbKvqRope` | IX.8 | slider `'channel pair'` | `'element pair'` |
| `pbKvqRope` | IX.8 | legend `'first channel of the pair, before RoPE'`, `'the same channel after RoPE'`, `'its partner channel after RoPE'` | `'first element of the pair, before RoPE'`, `'the same element after RoPE'`, `'its partner element after RoPE'` |
| `pbKvqRope` | IX.8 | plot label `'One pair of key channels before and after RoPE'` | `'One pair of key elements before and after RoPE'` |
| `pbKvqEscape` | IX.8 | — | no retired words seen; keep |
| `pbKvtcSpectrum` | IX.9 | plot label `'… with the water level of a lossy coder'` | `'… with the water level of a lossy compressor'` |
| `pbLexicoSparse` | IX.10 | — | no retired words seen; keep |
| `pbCachegenDelta` | IX.11 | legend `'one channel, token by token'`, `"the channel's typical value"` | `'one furrow, token by token'`, `"the furrow's typical value"` |
| `pbCachegenDelta` | IX.11 | legend `'group anchors (every 10th token)'` | `'reference tokens (every 10th token)'` ("anchor" is the nickname of furrow statistics on this site) |
| `pbCachegenDelta` | IX.11 | plot label `'One channel of a toy KV cache over 60 tokens'` | `'One furrow of a toy orchard over 60 tokens'` |
| `pbCachegenDelta` | IX.11 | axis `"variance ÷ the channel's own variance"` | `"variance ÷ the furrow's own variance"` |
| `pbCachegenDelta` | IX.11 | category names, if any say "anchor" or "channel" | "reference" / "furrow" |
| `pbKvcompGrid` | IX.12 | axis `'spread of the channel σ, in grid steps'` | `'spread of the furrow σ, in grid steps'` |

## Header comments

Both files open with "Part V (Papers), pages V.x"; the Part is now IX and the pages IX.1–IX.14. Comment only.

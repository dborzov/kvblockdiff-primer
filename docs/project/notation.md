# Notation

Words and code go together: a project word is introduced next to the expression that computes it, and the
expression is reused later in place of paraphrase. These are the conventions.

## Tensor index names

Python listings and inline code use these names, in this order, everywhere:

```python
K[token_pos_id, layer_id, head_id, elem_id]      # keys of one thread
V[token_pos_id, layer_id, head_id, elem_id]      # values of one thread
# the Bench (Qwen3.5-2B, FP8 E4M3, one byte per element):
K.shape == V.shape == (225_000, 6, 2, 256)
```

| index | math | meaning |
|---|---|---|
| `token_pos_id` | $\vt$ | position in the thread, from 0 |
| `layer_id` | $\vl$ | which layer with a KV store, 0 … $\vNL - 1$ |
| `head_id` | $\vh$ | which KV head |
| `elem_id` | $\vc$ | element position inside a head |
| `stanza_id` | $\vj$ | which run of $\vb$ positions |

Slices spell the concept; a slice is preferred to a sentence when the sentence would need an overloaded word:

```python
V[t, l]              # one position, one layer, both heads: the values half of one unit
V[:, l, h, 23]       # element position 23 of head h, along the whole thread
V[j*b:(j+1)*b, l]    # one run of b positions at layer l
V[0:4096, :, :, :]   # 4096 positions over all six layers
```

Math subscripts follow the same order: $(\vt, \vl)$, not $(\vl, \vt)$. The Pin's LLM stores one latent
vector per position per layer (MLA); its unit is `latent[t, l, :]`, 640 elements, and the same slices apply.

## Shapes and bytes in hover (planned)

Inline code of the form `` `V[…]` `` or `` `K[…]` `` will get a hover reminder with the slice's shape and
bytes in the current rig (`V[0:4096, 3]` → "(4096, 2, 256) · 2.1 MB on the Bench"). Until the engine has it,
write the shape and bytes in the sentence once.

## Symbols

- Every symbol is a macro from `data/symbols/` (`$\vrho$`, `$\ve$`), one meaning site-wide, coloured by
  family. Families: index, resource, count, frac, info, stat, object. Check the notation page before
  reusing a letter.
- Annotate the parts that matter: `\underbrace{…}_{\text{what it means}}`. Give the general formula, then
  plug in the rig's numbers.
- Display equations get an id, `$$ … $$ {#eq-topic-name}`, when anything refers to them.

## Numbers

- **Compression is a fraction of raw**: bytes out ÷ bytes in, three decimals when measured (0.636), two
  when estimated (0.78). Bits per element is $8 \times$ the fraction for 8-bit storage. A paper's "1.3×" is
  written as 0.77 of raw with the paper's figure in brackets once.
- Three ratios, never confused: **delta ratio** $\vrho$ (one delta ÷ raw, excludes the dictionary),
  **dictionary share** $\vw/\vb$ (dictionary bytes per unit ÷ raw), **MDL ratio** (their sum).
- Bytes in decimal units (1.5 KB, 20.9 GB) in prose and `[[@key]]`; the plot kit's `fmtBytes` prints KiB.
  Say which when it matters.
- Thin-space thousands (100 384) in rendered numbers; plain digits in code.
- Every number quoted for a rig names it or goes through `[[@key]]` (`docs/project/rigs.md`).

# Figure notes: Part II, pages II.13–II.25 (`figures/school-vectors.js`)

Label changes the figures task should make. Builders and data stay as they are; only UI text and
identifiers that leak into the page change. All pages reference the builders by their current names
(`svChannelTable`, `svCovScatter`, `svCovMatrix`, `svSpectrum`, `svKmeans`, `svAmortize`, `svDeskSim`,
`svReuse`), so renaming is optional; if `svChannelTable` is renamed (`svFurrowTable` would fit), update
`content/02-school/13-vectors.md` (`::: figure fig-sv-furrow-table svChannelTable`).

## The old column word → "furrow" (the column sense) or "element" (the position sense)

| builder | line (approx.) | says now | should say |
|---|---|---|---|
| `svChannelTable` | 369 | segmented control `minus each channel’s mean` | `minus each furrow’s mean` | <!-- old-words -->
| `svChannelTable` | 370 | `Click a column head to pick a channel, or a time to pick a vector.` | `Click a column head to pick a furrow, or a time to pick a vector.` | <!-- old-words -->
| `svChannelTable` | 406 | read-out row label `channel \vc = j` | `furrow \vc = j` (keep the `R[:, j]` idea: a row label `R[:, j]` next to it would match the page) | <!-- old-words -->
| `svChannelTable` | 412 | `standardized numbers are for comparing channels, not for sending` | `… for comparing furrows, not for sending` | <!-- old-words -->
| `svCovScatter` | 427 | control title `Which pair of channels` | `Which pair of furrows` | <!-- old-words -->
| `svCovScatter` | 431 | plot label `Scatter of two channels with their means` | `Scatter of two furrows with their means` | <!-- old-words -->
| `svCovScatter` | 446–447 | axis labels `… — channel ${a}` / `… — channel ${b}` | `… — furrow ${a}` / `… — furrow ${b}` (or `R[:, a]`) | <!-- old-words -->
| `svCovScatter` | 468 | read-out `on channel ${b}, knowing channel ${a}` | `on furrow ${b}, knowing furrow ${a}` | <!-- old-words -->
| `svCovMatrix` | 516 | hover `a channel with itself: always 1` | `a furrow with itself: always 1` | <!-- old-words -->
| `svCovMatrix` | 524 | read-out `each channel’s variance, in its own units squared` | `each furrow’s variance, in its own units squared` | <!-- old-words -->
| `svSpectrum` | 602 | preset label `Gull Rock, 5 channels` | `Gull Rock, 5 furrows` | <!-- old-words -->
| `svSpectrum` | (presets) | the two 64-channel presets of the first draft, if their labels say "channel" | `64 elements` | <!-- old-words -->
| `svKmeans` | 697 | read-out `spread² left, per channel` | `spread² left, per furrow` | <!-- old-words -->
| `svAmortize` | 1019 | preset label `channel means (II.13)` | `furrow means (II.13)` | <!-- old-words -->

Comments inside the file (lines 85–89, 235, 242, 358) also use the old column word; harmless, but the data
object `SV.CHANNELS` could become `SV.FURROWS` for consistency.

## The old word for an ask → "ask" (the cache toy of II.21–II.22)

The pages now call one line of the storm morning an *ask* (the forecaster asks for a logbook); the old
word for it is retired.

| builder | line (approx.) | says now | should say |
|---|---|---|---|
| `svDeskSim` | 889 | diagram label `The request list, the desk and the archive at one step` | `The list of asks, the desk and the archive at one step` | <!-- old-words -->
| `svDeskSim` | 897 | row label `requests` | `asks` | <!-- old-words -->
| `svDeskSim` | 928 | read-out `requests so far` | `asks so far` | <!-- old-words -->
| `svReuse` | 942 | control title `Request list` | `List of asks` | <!-- old-words -->
| `svReuse` | 946 | diagram label `Each request with its reuse distance` | `Each ask with its reuse distance` | <!-- old-words -->
| `svReuse` | 948 | histogram y label `requests` | `asks` | <!-- old-words -->
| `svReuse` | 964 | tooltip `∞ (first request)`, `${v} request(s)` | `∞ (first ask)`, `${v} ask(s)` | <!-- old-words -->
| `svReuse` | 975 | read-out `… of ${seq.length} requests`, `first requests (∞)` | `… of ${seq.length} asks`, `first asks (∞)` | <!-- old-words -->

## No new builders needed

II.13 and II.14 teach with numpy listings in the prose (`R.shape == (12, 5)`, `R[:, elem_id]`,
`np.cov(R.T, bias=True)`); the existing table, scatter and matrix figures carry them. One optional
improvement for `svChannelTable`: show the numpy expression of the current selection in the first
read-out (`R[3]` for a time, `R[:, 3]` for a column), since the page defines vector, element and furrow
by exactly those expressions.

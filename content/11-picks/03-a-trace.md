---
title: A trace, up close
nav: A trace, up close
group: The setting
lede: Every table of this Part is an average over 140 layers and thousands of steps. This page shows the thing being averaged, 600 consecutive steps of one layer, with every pick, every miss and every change of the shelf, and says what to look for in it.
cards:
  - q: In the trace of sequence 2, layer 9, which positions are picked at every one of the 600 steps?
    a: The first 256 positions, which hold the attention sinks, and the positions just before the step
    wrong: ["Only the positions of the current tool response", "No position is picked at every step", "Every position of stretch 18"]
    why: 'The first 256 positions get 6.6 picks per step and 1.5 % of the misses. The 256 positions before the step get 91 picks per step; a position picked for the first time always misses.'
    sec: what-to-look-for
  - q: What happens in the trace when the assistant starts writing after a tool response, at step 19 489?
    a: A band of picks appears about 550 to 1800 positions back, and the next step misses 220 of its 512 picks
    wrong: ["Nothing changes", "Every pick moves to the first 256 positions", "The step misses no pick at all"]
    why: 'Picks in positions 17 664 to 18 943 jump from 28 to 127 at step 19 490. Their stretches are on the shelf, so 190 of the 220 misses are δ-misses.'
    sec: what-to-look-for
  - q: Where in the trace do misses happen most often, relative to the picks?
    a: Where picks are thin; densely picked positions almost always hit
    wrong: ["In the densest band of picks", "Only in the first 256 positions", "Evenly over all picks"]
    why: 'Cells of 256 positions with 60 or more picks in a step miss 7 % of them; cells with a single pick miss 36 %. The five most-picked bins hold half the picks and a fifth of the misses.'
    sec: what-to-look-for
  - q: How often does the dictionary shelf change in the 600 steps shown?
    a: 'Three of its four stretches never leave; the fourth slot changes 38 times, mostly between two stretches'
    wrong: ["At every step", "Never", "Every 32 steps exactly"]
    why: 'Stretches 16, 17 and 18 stay for all 600 steps. The fourth slot alternates between stretch 15 and stretch 4; stretch 19 enters for good at step 19 746.'
    sec: what-to-look-for
  - q: Is the 600-step window typical of its layer?
    a: 'Yes: it misses 19.1 % and catches 58 % of misses on the shelf, against 19.4 % and 60 % for the whole layer'
    wrong: ["No, it was chosen for its extreme miss rate", "No, it has no misses", "It cannot be compared"]
    why: 'Layer 9 has the median miss rate of the 28 layers; the window was chosen around a change of token kind, and its averages match the layer''s.'
    sec: the-window
---

At step 19 490 of sequence 2 of [[bachelor|the Bachelor]], layer 9 of Qwen 2.5 1.5B looks back over 19 490 positions and the stand-in indexer names 512 of them. 220 of those 512 are not in the hot cache. The step before, 15 were missing. Nothing about the LLM changed between the two steps; the text did. The assistant had just started writing, after a tool response that fills the first 185 steps of the window.

The tables of the next pages average over 140 (sequence, layer) pairs and every step from position 8192 on. This page looks at the raw material instead: 600 consecutive steps of one layer, with each pick, each miss and each state of the [[dictionary-shelf|dictionary shelf]] drawn.

## The window {#the-window}

The window is chosen to be ordinary, with one change of activity in the middle.

- **Where.** Sequence 2 (the third of five), layer 9, steps 19 300 to 19 899. Layer 9 has the median miss rate of the 28 layers.
- **The setting.** The pin-scaled configuration of [[#picks-carrying-numbers/configurations]]: $\vk$ = 512 picks per step, no resident window, a hot cache of $\vB$ = 1024 slots. The shelf holds $\vnD$ = 4 dictionaries of stretches of 1024 positions, chosen by popularity over the last 32 steps ([[#picks-heavy-stretches/policies]]).
- **What happens in the text.** Steps 19 300–19 484 read a tool response; 19 485–19 488 are chat-template tokens; at 19 489 the assistant writes text, at 19 565 it writes a tool call, and from 19 715 a new tool response is read.
- **Typical.** Over the window, 97.7 of the 512 picks miss per step (19.1 %) and 58 % of the misses are δ-misses. Over the whole layer from step 8192 on: 19.4 % and 60 %.

::: figure fig-picks-raster picksRaster wide
**600 steps of one layer's picks.** Sequence 2, layer 9, pin-scaled ($\vk$ = 512, $\vB$ = 1024). Horizontal axis: the decode step $\vt$, 19 300 to 19 899. Vertical axis: the position of a pick, 0 to 19 900, in bins of 256 positions; the dashed diagonal is the newest position, $\vt - 1$. A cell is shaded by how many of the step's picks fall in those 256 positions (darker, more) and coloured where some of them missed: one colour for raw misses, another for δ-misses, whose stretch's dictionary was on the shelf. Bands mark the four stretches of 1024 positions on the shelf at each step (popular over `P = 32` steps). Below: a strip of token kinds (reading a user turn or a tool response, assistant text, tool call) and the misses per step, raw and δ, stacked. Controls: play, the step slider (or click any cell), and a switch between all positions and the newest 5120. The readout gives the chosen step's picks, misses and δ-misses, the stretches on the shelf, and the window's totals against the whole layer's. One window of one layer, an illustration; every table of this Part uses all of them. Grade: measured.
:::

::: takeaway
- Sequence 2, layer 9, steps 19 300–19 899: 512 picks per step, 19.1 % missed, 58 % of misses on the shelf; the layer as a whole misses 19.4 % and shelves 60 %.
- In the middle, the assistant starts writing (19 489) after a tool response, then makes a tool call (19 565).
:::

## What to look for {#what-to-look-for}

1. **Two regions are picked at every step.** The first 256 positions, which hold the four sink positions of [[#picks-the-bachelor/mass]], are picked at all 600 steps (6.6 picks per step) and hold 1.5 % of the misses. The 256 positions just before the step get 91 picks per step. New positions appear in this region at every step, and a position picked for the first time always misses: the two most recent bins hold 9.3 % of the misses.
2. **A band appears when the assistant starts writing.** At step 19 490, picks in positions 17 664 to 18 943 jump from 28 to 127, and the step misses 220 picks, 2.3 times the window's mean. Over steps 19 500–19 519 that region holds 198 picks per step, against 54 in the 50 steps before. Misses per step follow the activity: 85 while the tool response is read, 115 while the assistant writes, 99 during the tool call, 103 in the next tool response.
3. **Misses sit where picks are thin.** A cell of 256 positions picked 60 or more times in a step misses 7 % of those picks; a cell picked once misses 36 %. The five most-picked bins hold 50 % of the picks and 22 % of the misses. Dense regions stay in the hot cache; the thin scatter around them is what the link carries.
4. **The heaviest stretches are the recent ones.** Counting a step's misses by stretch of 1024, the heaviest is stretch 18 (positions 18 432 to 19 455) in 235 of the 600 steps, stretch 16 in 132 and stretch 17 in 94. On average the heaviest stretch holds 29 % of a step's misses and the heaviest four 67 %, close to the 31 % and 71 % of the whole replay ([[#picks-heavy-stretches]]).
5. **The shelf barely moves.** Stretches 16, 17 and 18 stay on the shelf for all 600 steps. The fourth slot changes 38 times, mostly between stretch 15 and stretch 4 (positions 4096 to 5119, a far region the tool call returns to: 28 picks per step there during the tool call, 9 before it). Stretch 19 holds the newest positions; it enters for good at step 19 746.

The δ-miss fraction moves with the text: 0.58 during the first tool response, 0.76 while the assistant writes (the new band lies in stretches 17 and 18, which are on the shelf), 0.50 during the tool call, when stretch 4 is busy but on the shelf only part of the time, and 0.55 in the next tool response, whose misses scatter over many stretches. Its worst step, 19 733, misses 310 picks spread over all 20 stretches, and 146 of them are δ-misses.

::: try
1. Put the cursor on step 19 489, then 19 490. The miss count jumps from 15 to 220; 190 of the 220 are δ-misses.
2. Switch to the newest 5120 positions, set the step to about 19 470 and press play. Watch positions 17 664 to 18 943 (about 550 to 1800 positions back): a band thickens as the assistant starts writing and fades during the tool call.
3. With all positions shown, find the bottom row of cells (positions 0 to 255). It is shaded at every step and almost never coloured as a miss.
4. Move through steps 19 600 to 19 710 and watch the shelf's bands and the readout: the fourth stretch on the shelf jumps between 15 and 4.
5. Go to step 19 733 in the second tool response. It is the worst step of the window: 310 misses, less than half of them on the shelf.
:::

::: theme which-vs-what
Nothing on this figure is a byte. The picture is made of which positions were wanted at which step; the band at 17 664 is there because the assistant's next words depend on those positions, not because their keys or values resemble each other.
:::

::: takeaway
- The first 256 positions and the most recent ones are picked at every step; each new position misses once.
- A change of activity (the assistant starting to write) moves a band of picks and doubles the misses for a few steps; most of those misses are on the shelf.
- Misses fall where picks are thin; the shelf keeps the three most recent stretches throughout and swaps the fourth 38 times in 600 steps.
:::

::: aside source Receipts
bachelor-kv at commit 8f5a471: `results/summary/raster_excerpt.json` (written by `analysis/raster_excerpt.py` at 18b4f75; trace `traces/case_00002/rank_g1.npy`, layer 9; picks and misses binned by 256 positions as base64 uint8; shelf membership reconstructed and checked against the replay engine's δ-miss counts over the whole sequence). Every number on this page was computed from that file: per-step misses and δ-misses (`per_step`), bins, token kinds and shelf states; window 0.191 / 0.579, layer 0.194 / 0.603 (`window_summary`, `whole_layer`). Grade: measured, one window of one layer.
:::

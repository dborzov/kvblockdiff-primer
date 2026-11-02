---
title: Old words, new words
nav: Old words, new words
group: Words
lede: Three translation tables. The words of this site's first draft, the words of the experiment repository, and the common words of the papers, each next to the word this site uses now. Hover any chip for its reminder; every right-hand cell links to the page where the word is defined.
cards:
  - q: The first draft used one word for the thing the indexer names and the thing the receiver asks for. What are the two words now?
    a: A pick (what the indexer names) and a cherry (what the receiver asks for and the sender answers with a delta)
    wrong: ["A stretch and a punnet", "A slice and a cherry shape", "A furrow and an element"]
    why: A pick is one unit of demand, (layer_id, token_pos_id); it is served with one or more cherries, by the scenario's cherry shape.
    sec: old-site
  - q: 'The ledger names a screen `s-layer-b4k-r293`. Written as a scenario, that is…'
    a: 'V · all · cherry (2, 256) · stretch 4096 · leash 293, on the screen''s sample of punnets'
    wrong: ["K · layer 4 · cherry (256,) · stretch 4096 · leash 293", "V · cherry (6, 2, 256) · stretch 293 · leash 4096", "V · one head · stretch 4096 · no leash"]
    why: '"layer" is the ledger''s name for the cherry shape that stacks both heads of one layer; "b4k" is the stretch length; "r293" is the leash.'
    sec: repo
  - q: 'KIVI rounds keys with one scale per position in the head vector, and values with one scale per token. In this site''s words?'
    a: Keys per furrow, values per cherry
    wrong: ["Keys per stretch, values per punnet", "Keys per element, values per layer", "Keys per pick, values per slice"]
    why: A furrow is one element position followed along the token axis; a cherry is one token's vector (or vectors) at one layer.
    sec: papers
---

The first draft of this site used one word for several things and several words for one thing, and the experiment repository grew its own dialect during two nights of work. The rule that replaced both is in `docs/style/terminology.md`; these tables are its translation half. The left column of each table carries the retired word; the right column is the word this site uses, as a chip or as a link to the page that defines it.

## The old site's words {#old-site}

The first draft's words, and what they became. Where one old word had split into several meanings, the row lists each meaning and its own new word.

| their word | ours |
|---|---|
| KV cache, KV history, KV store | [[orchard\|the orchard]] <!-- old-words -->
| entry (the selected thing) / entry (the compressed thing) | [[pick]] / [[cherry]] <!-- old-words -->
| entry split | [[slice]] + [[cherry-shape\|cherry shape]] <!-- old-words -->
| block (a token range) / block (the data) / block size $b$ | [[stretch]] / [[punnet]] / [[stretch\|stretch length]] <!-- old-words -->
| channel (the index) / channel (the column) / channel (the wire) | [[element]] / [[furrow]] / [[link\|the link]] <!-- old-words -->
| request, thread, conversation, context (as a noun) | [[sequence]] <!-- old-words -->
| model, the network / proxy model | [[llm\|the LLM, named]] / [[stand-in-llm\|stand-in LLM]] <!-- old-words -->
| coder, codec, algorithm, method, scheme | [[compressor]] <!-- old-words -->
| component, step, module (of a coder) | [[stage]] <!-- old-words -->
| read budget, dictionary budget, random-access rule / dict reads | [[leash\|the leash]] / [[reads]] <!-- old-words -->
| dictionary cache | [[dictionary-shelf\|dictionary shelf]] <!-- old-words -->
| hot block | [[on-fire\|on fire]] <!-- old-words -->
| heavy block | [[heavy-stretch\|heavy stretch]] <!-- old-words -->
| request scope / block scope | [[scope-sequence\|sequence scope]] / [[scope-stretch\|stretch scope]] <!-- old-words -->
| selector (as a noun) | [[indexer\|the indexer]] <!-- old-words -->
| selection (as a noun), the indexer's choice | [[pick]] <!-- old-words -->
| residual bytes, payload | [[delta]] <!-- old-words -->
| side-information structure, codebook (meaning all of it) | [[dictionary]] <!-- old-words -->
| compression ratio (the inverse), rate (bare) | [[mdl-ratio\|MDL ratio]] <!-- old-words -->
| per-entry coding, context-free coding | [[solo]] <!-- old-words -->
| the framework, the test bench | [[harness\|the harness]] <!-- old-words -->
| kv-blockdiff, blockdiff | [[kvblockdiff]] <!-- old-words -->
| exact-model estimate | [[code-length-estimate\|code-length estimate]] <!-- old-words -->
| reference setting (the one rig) | [[reference-setting]]: [[pin\|the Pin]] and [[bench\|the Bench]] <!-- old-words -->

::: takeaway
- The split that mattered most: the one old word for the selected thing and the compressed thing became pick and cherry, and the other old word for a token range and for the data became stretch and punnet.
- One letter, one meaning: the three senses of the column word became element, furrow and the link.
:::

## The experiment repository's words {#repo}

The ledgers, the notes and the researcher agents' pages of `kv-compress-roofline` keep their own words, and receipts on this site quote them verbatim inside source asides. Everywhere else they are translated.

| their word | ours |
|---|---|
| entry, entry set | [[cherry]], [[punnet]] <!-- old-words -->
| block (positions) / block (data) | [[stretch]] / [[punnet]] <!-- old-words -->
| entry split: head / layer / token / tok2, tok4 | [[cherry-shape\|cherry shape]] `(256,)` / `(2, 256)` / `(6, 2, 256)` / two or four adjacent tokens of one layer <!-- old-words -->
| channel, elephant line | [[element]], [[furrow]] <!-- old-words -->
| sequence, thread | [[sequence]] <!-- old-words -->
| read budget `r137`, `r293`, `r1103` | [[leash\|leash 137, 293, 1103]] <!-- old-words -->
| coder, algorithm `NN-slug` | [[compressor\|compressor NN-slug]] <!-- old-words -->
| map, linear prediction | [[linear-prediction\|linear prediction]] <!-- old-words -->
| anchor, exemplar, reference | [[reference-cherry\|reference cherry]] <!-- old-words -->
| tree, MST, reference tree | [[reference-tree\|reference tree]] <!-- old-words -->
| track `s-layer-b4k-r293`, screen `st02n5-…` | [[scenario]] on a [[screen]]: V · all · cherry `(2, 256)` · stretch 4096 · leash 293 <!-- old-words -->
| x, y, w | [[dictionary-share\|dictionary share]], [[delta-share\|delta share]], [[weight\|dictionary weight]] <!-- old-words -->
| MDL ratio | [[mdl-ratio\|MDL ratio]] <!-- old-words -->
| isolated verification, `verification.isolated: true` | [[verified-result\|verified]] <!-- old-words -->
| exact model | [[code-length-estimate\|code-length estimate]] <!-- old-words -->
| shared table | [[shared-table\|shared table]] <!-- old-words -->
| the model, the network | [[llm\|the LLM]] (Qwen3.5-2B) <!-- old-words -->
| solo | [[solo]] <!-- old-words -->

::: takeaway
- The ledger's three cuts, head, layer and token, are three cherry shapes of one slice; its track names are scenarios on a screen.
- Anchor and exemplar are reference cherries; the Anchor with a capital is the nickname of furrow statistics, something else entirely.
:::

## The papers' common words {#papers}

Each paper page in Part IX ends with its own table. These are the words that come up in most of them.

| their word | ours |
|---|---|
| KV cache | [[orchard\|the orchard]] <!-- old-words -->
| token-wise, per-token quantisation (KIVI's values) | [[cherry\|per-cherry]] [[quantization\|rounding]] <!-- old-words -->
| channel-wise, per-channel (KIVI's keys, KVQuant) | [[furrow\|per-furrow]] <!-- old-words -->
| outlier channel | [[furrow\|outlier furrow]] <!-- old-words -->
| page (Quest) | [[stretch\|a stretch of 16 tokens]] <!-- old-words -->
| group (KIVI, KVQuant) | [[scale-group\|a scale group]] <!-- old-words -->
| codebook, universal dictionary (when it means the whole side information) | [[dictionary]] <!-- old-words -->
| exponent coder, lossless float codec (SplitZip, ZipNN) | a [[solo]] [[compressor]] with a [[bit-field-split\|bit-field split]] <!-- old-words -->
| selector, sparse selection (DSA, NSA, CSA) | [[indexer\|the indexer]] and its [[pick\|picks]] <!-- old-words -->
| request, prompt, context (as a noun for one conversation) | [[sequence]] <!-- old-words -->
| latent (MLA) | one [[mla\|MLA]] latent per token per layer, what the orchard holds for GLM-5.1 <!-- old-words -->
| prefill-to-decode transfer, disaggregated serving | the bulk [[data-path\|data path]], [[disaggregation]] <!-- old-words -->

::: theme bits-unit
A paper's "similar", "close" or "low-rank" is translated and then priced: a property counts here only once it is stated in bits per element, on the same punnets, with every byte of side information charged.
:::

::: takeaway
- The papers' per-token and per-column words become per-cherry and per-furrow; a page is a short stretch; a group is a scale group.
- Translate first, then price in bits; a resemblance that does not convert to bits does not count.
:::

# CLAUDE.md

Orientation for future Claude Code sessions working on this repo. Keep this file current — it ships in the public repo.

## What this is

A static, browser-only Monte Carlo simulator that helps readers reason about Claude Code token costs, session coherence (heuristic), and context-window pressure. Audience: technical readers as a blog-post companion. Sandbox-style A/B comparison, sharable via URL hash. No backend. No API keys. Math is deliberately simple and transparent — the goal is pedagogy, not billing accuracy.

## Constraints to preserve

- **Browser-only, no backend.** All state lives in URL hash (lz-compressed). Anything you add must run in the browser.
- **Static deploy.** `adapter-static` with SPA fallback. GitHub Pages, Vercel, Netlify all work.
- **Math is heuristic.** Coherence Index is NOT an Anthropic metric. Public statistics for MCP/Skill usage do not exist; defaults are educated guesses. Always disclose this in user-facing copy.
- **Pedagogy over precision.** When in doubt, prefer the parameter or visualization that helps a learner *understand the effect*, even if it slightly oversimplifies.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | SvelteKit 2 + Svelte 5 (Runes) | Compact bundle, reactive enough for many sliders |
| Types | TypeScript strict | Engine math is easy to break silently |
| Build | Vite + `adapter-static` | Static SPA, no server |
| Compute | Web Worker | Keeps UI responsive during 400–1000 MC samples |
| Charts | D3 v7 (vanilla, no Layercake) | Threshold lines + band fills need fine control |
| Validation | Zod | URL hash is untrusted input |
| Tests | Vitest | Engine math + URL codec round-trip |

## Module map

```
src/
  routes/
    +page.svelte                     # main app shell; sticky topbar, scrolling inputs, sticky charts
    methodology/+page.svelte         # math doc, mirrors engine formulas
  lib/
    engine/
      types.ts                       # Config, RunOutput — schema source of truth
      rng.ts                         # mulberry32 (seeded), hashStringToSeed
      distributions.ts               # truncated normal, binomial, Zipf-activation w/ rebalancing
      activation.ts                  # per-session MCP / Skill sampling, call scheduling
      coherence.ts                   # parametric sigmoid + clamp01
      simulate.ts                    # one trajectory — THE core file for math changes
      monteCarlo.ts                  # N trajectories → mean/p10/p90 + zoom aggregation
      worker.ts                      # Web Worker entrypoint
    state/
      schema.ts                      # Zod schemas (mirrors types.ts)
      stores.ts                      # Svelte stores + URL sync
      runner.ts                      # Worker lifecycle + debounce
      url.ts                         # hash codec (lz-string)
    data/
      models.ts                      # Opus/Sonnet/Haiku defaults, ctxWindowMax
      presets.ts                     # Lean / Solo Dev / Enterprise / No-Cache / ZDR-Heavy / Long Session
    ui/
      Help.svelte                    # tooltip popover used everywhere
      help-texts.ts                  # ALL user-facing explanatory copy lives here
      ConfigSwitcher.svelte          # Baseline / Variant toggle + Share URL + Methodology link
      ZoomSelector.svelte
      PresetGallery.svelte
      MetaStats.svelte
      panels/
        InputPanel.svelte            # all slider sections; long file but deliberately flat
        Section.svelte               # collapsible <details>, accepts help prop
        Slider.svelte                # range + number paired, accepts help prop
        MeanSdInput.svelte           # composed of two Sliders
      charts/
        LineChart.svelte             # D3 line + p10/p90 band + threshold lines
        OverheadBar.svelte           # stacked baseline-overhead bar
        utils.ts                     # pickSeries, cumulative, fmtUsd/Tokens/Pct
      delta/DeltaCard.svelte         # comparison summary
    feedback.ts                      # newIssueUrl helper — reads PUBLIC_REPO_URL at build time
```

## Where math lives

Three layers, top-to-bottom of the call stack:

1. **`engine/simulate.ts`** — one trajectory, turn-by-turn. This is where cache logic, compaction, cost composition, and coherence evaluation happen. If you\'re fixing a "the simulator says X but should say Y" bug, start here.
2. **`engine/monteCarlo.ts`** — runs N trajectories with one seeded PRNG, then aggregates. Pure aggregation, no domain logic.
3. **`engine/worker.ts`** — message-passing only.

Distributions and activation logic are extracted into `distributions.ts` / `activation.ts` because they each have non-obvious math (truncated normal rejection, Zipf-probability rebalancing for activation count = expectedCount).

Mirror invariant: every formula visible in the methodology page comes from one of these files. **If you change a formula in `simulate.ts`, update `methodology/+page.svelte` in the same PR.**

## Key design decisions you should know

- **Compaction trigger is window-relative.** `compaction.triggerPct × ctxWindow`, default 92%. Originally absolute (150k) — changed because the absolute value misled on Sonnet 4.6\'s 1M context.
- **Context-window slider is capped per-model.** `MODEL_DEFAULTS[id].ctxWindowMax`. Don\'t remove the cap; users get confused when they can drag past the real model max.
- **Coherence Index is renamed but not the field.** UI shows "Coherence Index (heuristic)". Code field is `config.quality` for now. Disclaimer about not-Anthropic-measured belongs everywhere this metric appears.
- **MCP / Skill usage is Bernoulli per server.** Two distributions: uniform (each server equally likely) and Zipf-weighted long-tail. There are no public usage stats — defaults are heuristic; explicitly invite override in tooltips.
- **Cache invalidation on inline-skill trigger.** A skill placed `inline` breaks the messages-cache from that turn onward. A skill placed `prefix` is always loaded but stays in the cacheable prefix. This is the educationally important MCP/Skill cost mechanism.
- **URL is the single source of truth.** Stores subscribe to hash changes; mutations debounce-write to hash. Anyone landing on a config URL gets the same state. Don\'t add state that isn\'t in `DualConfig`.

## Build / dev / test

```bash
npm run dev        # localhost:5178 (or next free port)
npm run check      # svelte-check; must be 0 errors, 0 warnings
npm run test       # vitest; 35 tests; engine + URL codec
npm run build      # static output in ./build
```

CI (`.github/workflows/deploy.yml`) runs `test → check → build`. Build sets `BASE_PATH=/<repo>` and `PUBLIC_REPO_URL` so the in-app feedback links and asset paths are correct on GitHub Pages.

## Common tasks

### Adjust math defaults

1. Edit `src/lib/data/presets.ts` (per-preset) or the `baseConfig()` function in the same file (global default).
2. Update the methodology page (`src/routes/methodology/+page.svelte`) if the default appears there.
3. Run `npm run test` — `simulate.test.ts` exercises the Solo-Dev preset.

### Add a new slider

1. Add the field to `Config` in `src/lib/engine/types.ts`.
2. Mirror in `src/lib/state/schema.ts` Zod schema.
3. Add an entry to `src/lib/data/presets.ts` `baseConfig()`.
4. Wire into `engine/simulate.ts` if it affects the math.
5. Add the slider to the relevant Section in `InputPanel.svelte`.
6. Write a Help string in `src/lib/ui/help-texts.ts` and pass via `help={HELP....}`.
7. If user-facing, document in methodology.

### Add a preset

Append to `PRESETS` array in `src/lib/data/presets.ts`. Each is a function returning a full `Config`.

### Add a chart

Use `LineChart` for time-series; for novel shapes write a new `*.svelte` next to it. Charts read from the `output` store. Width-responsive via ResizeObserver — see existing implementation.

### Update Anthropic pricing

`src/lib/data/models.ts`. The numbers also appear in the methodology table — update both.

## How to answer user questions

The footer feedback links open prefilled GitHub issues with the user\'s current `#cfg=...` URL. To reproduce a reported issue locally, paste that URL into `http://localhost:5178/#cfg=...` — your dev server will hydrate the exact state.

If a user reports a math discrepancy:

1. Walk through `engine/simulate.ts` with their config. Most issues are mis-calibrated defaults, not formula bugs.
2. Check the cite in the methodology page is still valid (Anthropic docs move).
3. If the formula is wrong, fix in `simulate.ts` + `methodology/+page.svelte` + at least one Vitest test that pins the corrected behaviour.

If a user reports UX confusion:

1. Look at the relevant Section in `InputPanel.svelte` and its Help text in `help-texts.ts`.
2. Confusing label? Edit the Help string. It\'s the cheapest fix.
3. Confusing chart? Threshold annotations live in `+page.svelte` where `LineChart` is called. Add or rename thresholds there.

## Gotchas

- **Svelte 5 stores in `<script lang="ts">`**: don\'t declare `const $foo = ...`. The `$` prefix is reserved for store auto-subscribe. If you need the snapshot, import the type and parameterize functions instead.
- **Type the boolean compounds** in `simulate.ts` (e.g. `const cacheActiveThisTurn: boolean = ...`). Otherwise strict TS infers `any` when the chain involves `lastCacheActive` referenced in its own initializer\'s closure.
- **Truncated normal rejection** caps at 16 tries — for extreme parameter combos this can fall back to `mean`. Acceptable for a heuristic sim, but be aware when debugging.
- **`PUBLIC_REPO_URL`** is read via `$env/dynamic/public` so the fallback (`treinberger/token-sim`) is used in dev. CI replaces it from `github.repository`.
- **Web Worker imports** must use `new URL(\'$lib/engine/worker.ts\', import.meta.url)` so Vite resolves correctly in both dev and build.

## What\'s explicitly out of scope (v1)

Image/PDF tokens, per-tool result token distributions, per-user activation bias vectors, skill stickiness across sessions, live pricing fetch, multi-language UI, persistence beyond URL hash. PRs that add these need brainstorming first — the simulator is meant to stay small and legible.

## Original design spec

[`docs/superpowers/specs/2026-05-18-token-sim-design.md`](./docs/superpowers/specs/2026-05-18-token-sim-design.md). Reflects the v1 decisions; subsequent changes (compaction → pct, ctxWindowMax cap, sticky topbar, feedback links) supersede the relevant sections.

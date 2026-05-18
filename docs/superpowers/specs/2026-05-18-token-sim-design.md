# token-sim — Design Spec

**Date:** 2026-05-18
**Status:** Approved (user waived final review, autonomous build)

## Goal

Browser-only educational Monte Carlo simulator for Claude Code token costs, session quality (heuristic), and context-window utilization. Target audience: technical readers as a blog-post companion. Sandbox modus with A/B configuration comparison.

## Constraints

- Client-only. Static deploy (Vercel / GitHub Pages).
- No backend, no auth, no analytics by default.
- Shareable via URL hash (full state encoded).
- All defaults heuristic; user-editable. Pricing as of 2026-05.

## Architecture

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (Runes) |
| Type | TypeScript strict |
| Build | Vite + `adapter-static`, SPA fallback |
| Math compute | Web Worker (`Web Worker / ES module`) |
| Validation | Zod |
| Charts | D3 v7 + Layercake |
| Tests | Vitest |

### Module tree

```
src/
  routes/
    +layout.svelte          # global shell, theme
    +page.svelte            # app
    methodology/+page.svelte # math documentation
  lib/
    engine/
      types.ts              # Config, RunOutput
      rng.ts                # seeded PRNG (mulberry32)
      distributions.ts      # truncatedNormal, logNormal, binomial, zipf
      activation.ts         # MCP/Skills per-session sampling
      cache.ts              # write/read cost, TTL gates, invalidation
      coherence.ts          # parametric sigmoid + penalties
      simulate.ts           # one trajectory
      monteCarlo.ts         # N runs → aggregates p10/mean/p90
      zoom.ts               # turn/session/day/month
      worker.ts             # entrypoint
    state/
      schema.ts             # Zod schemas
      stores.ts             # baseline, variant, active, output
      url.ts                # hash codec (compact)
    data/
      models.ts             # Opus 4.7 / Sonnet 4.6 / Haiku 4.5 defaults
      presets.ts            # Lean / Solo-Dev / Enterprise / No-Cache
    ui/
      panels/
        InputPanel.svelte
        WorkloadSection.svelte
        ModelSection.svelte
        CacheSection.svelte
        McpSection.svelte
        SkillsSection.svelte
        QualitySection.svelte
        TeamSection.svelte
        CompactionSection.svelte
        Slider.svelte
        MeanSdInput.svelte
      charts/
        CostChart.svelte
        QualityChart.svelte
        WindowStackChart.svelte
        SparklineUsage.svelte
      delta/
        DeltaCard.svelte
      ConfigSwitcher.svelte
      ZoomSelector.svelte
      PresetGallery.svelte
```

## Data model

### `Config`

```ts
type MeanSd = { mean: number; sd: number };

type Config = {
  workload: {
    turnsPerSession: MeanSd;
    userInputTokens: MeanSd;           // per turn
    assistantOutputTokens: MeanSd;
    thinkingTokens: MeanSd;            // billed as output
    toolResultTokens: MeanSd;          // bash/read/etc., feeds next turn input
    systemPromptTokens: number;
    baseContextTokens: number;         // repo + CLAUDE.md
    interTurnDelaySec: MeanSd;         // gates 5m vs 1h cache
  };
  mcpServers: {
    installed: number;
    avgTokensPerServer: MeanSd;        // schemas in system prompt
    activationProbPerSession: number;
    usageDistribution: 'uniform' | 'longtail';
    longtailExponent: number;          // Zipf s, default 1.3
    callsWhenActive: MeanSd;           // ≥ 1
    tokensPerCall: MeanSd;             // args + result
  };
  skills: {
    installed: number;
    metadataTokensPerSkill: MeanSd;    // always loaded
    activationProbPerSession: number;
    usageDistribution: 'uniform' | 'longtail';
    longtailExponent: number;
    fullContentTokens: MeanSd;         // on trigger
    placement: 'prefix' | 'inline';    // affects cache invalidation
  };
  model: {
    id: 'opus-4-7' | 'sonnet-4-6' | 'haiku-4-5';
    ctxWindow: number;                 // tokens
    priceInputPerM: number;
    priceOutputPerM: number;
    priceCacheWrite5mPerM: number;     // 1.25× input
    priceCacheWrite1hPerM: number;     // 2× input
    priceCacheReadPerM: number;        // 0.1× input
    minCacheableTokens: number;        // 1024 Sonnet, 4096 Opus/Haiku
  };
  cache: {
    enabled: boolean;
    ttl: '5m' | '1h';
    breakpoints: number;               // 1..4
  };
  zdr: boolean;                        // true → cache forced off
  team: { users: number; sessionsPerUserPerDay: number };
  quality: {
    decayStartPct: number;             // % window before decay
    steepness: number;
    floor: number;
  };
  compaction: {
    triggerTokens: number;             // absolute, default 150000
    retentionFactor: number;           // default 0.2
    summaryOutputTokens: MeanSd;       // default {3000, 800}
    qualityPenalty: number;            // default 0.05
  };
  mc: { samples: number; seed: number };
};
```

### `RunOutput`

```ts
type Stat = { mean: number; p10: number; p90: number };

type RunOutput = {
  perTurn: Array<{
    turnIdx: number;
    contextTokens: Stat;
    windowUtil: Stat;
    freshInputTokens: Stat;
    cachedInputTokens: Stat;
    outputTokens: Stat;
    cost: Stat;
    coherence: Stat;          // 0..1, heuristic
    compactionTriggered: number; // P(compaction at this turn) 0..1
  }>;
  summary: {
    totalCost: Stat;          // per session
    meanCoherence: Stat;
    peakWindowUtil: Stat;
    cacheHitRatio: Stat;      // cached / (fresh + cached)
    sessionsToCompaction: Stat;
  };
  zoom: {
    perSession: typeof summary;
    perDay:    { cost: Stat; sessions: number };
    perMonth:  { cost: Stat; sessions: number };
  };
};
```

## Math

See `methodology/+page.svelte` for the user-facing doc. Below is the implementation core.

### Per MC iteration

```text
sample N(mean, sd):                       Box-Muller, clipped to ≥ 0
sample TruncNormal(mean, sd, ≥ 0):        rejection sampling, max 16 tries

session-level samples (drawn once):
  turns        = round(TruncNormal(workload.turnsPerSession, ≥ 3))
  activatedMcp     = Binomial(installed, p)            if uniform
                   = Zipf-weighted sample              if longtail
  activatedSkills  = same approach
  call schedule    = distribute uniformly over turns (each call lands on random turn)

baseline overhead t0:
  overhead = systemPromptTokens
           + baseContextTokens
           + installed_mcp × avgTokensPerServer
           + installed_skills × metadataTokensPerSkill
           + (placement == 'prefix' ? expectedTriggeredFullContent : 0)

per turn t (1..turns):
  userIn        = TruncNormal(workload.userInputTokens)
  assistantOut  = TruncNormal(workload.assistantOutputTokens)
  thinking      = TruncNormal(workload.thinkingTokens)
  toolResults   = (mcpCalls_t × tokensPerCall) + bashLike  (scheduled at this turn)
  inlineSkill   = placement == 'inline' ? skillTrig_t × fullContentTokens : 0
  newInputTokens   = userIn + toolResults + inlineSkill
  newOutputTokens  = assistantOut + thinking

  contextTokens_t = contextTokens_{t-1} + newInputTokens + newOutputTokens
                     (start with overhead at t=0)

  windowUtil_t = contextTokens_t / model.ctxWindow

  // Compaction (absolute trigger, not %)
  if contextTokens_t > compaction.triggerTokens:
    summaryOut = TruncNormal(compaction.summaryOutputTokens)
    contextTokens_t = max(overhead, contextTokens_t × compaction.retentionFactor) + summaryOut
    compactionEvents++
    coherencePenalty += compaction.qualityPenalty
    cost += summaryOut × priceOutputPerM / 1e6
    // cache: prefix survives, messages-block requires re-write

  // Cache gate
  ttlSec = cache.ttl == '5m' ? 300 : 3600
  gap = TruncNormal(workload.interTurnDelaySec)
  cacheActive = cache.enabled && !zdr
              && overhead >= model.minCacheableTokens
              && gap <= ttlSec
              && (t == 1 || lastTurnCacheActive)   // continuity
              && (placement != 'inline' || !triggeredThisTurn)

  if cacheActive:
    if t == 1 || lastTurnCacheActive:
      cachedInput = contextTokens_{t-1}  (everything from prior turn was cached)
      freshInput  = newInputTokens
    else:
      cachedInput = 0
      freshInput  = contextTokens_t
    cacheWrite  = freshInput  // becomes cache for next turn
  else:
    cachedInput = 0
    freshInput  = contextTokens_t
    cacheWrite  = 0

  cachePriceWrite = cache.ttl == '5m' ? priceCacheWrite5mPerM : priceCacheWrite1hPerM
  cost_t = freshInput     × priceInputPerM      / 1e6
         + cachedInput    × priceCacheReadPerM  / 1e6
         + cacheWrite     × cachePriceWrite     / 1e6
         + newOutputTokens × priceOutputPerM    / 1e6

  // Coherence (heuristic, NOT an Anthropic metric)
  // u = windowUtil_t, d, s, f from config.quality
  sig = 1 / (1 + exp(-(u - d) × s))
  coherence_t = clamp(f + (1 - f) × (1 - sig) - coherencePenalty, 0, 1)
```

### Aggregation over N runs

For each `(turn, metric)` collect samples → `mean`, `p10` (`Math.floor(0.1 × N)`), `p90`.

### Defaults / model pricing (2026-05, approximate)

| Model | ctx | in $/M | out $/M | cacheW 5m | cacheR | min-cacheable |
|---|---:|---:|---:|---:|---:|---:|
| Opus 4.7 | 200k | 15.00 | 75.00 | 18.75 | 1.50 | 4096 |
| Sonnet 4.6 | 1 000k | 3.00 | 15.00 | 3.75 | 0.30 | 1024 |
| Haiku 4.5 | 200k | 1.00 | 5.00 | 1.25 | 0.10 | 4096 |

User-editable in UI.

## UI layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Token-Sim                              [Methodology]  [Share URL] │
├────────────────────────────────────────────────────────────────────┤
│  [⊙ Baseline] [○ Variant]   Δ Cost +45%  Δ Coh -12%  Δ Win +8 pp  │
├──────────────────┬─────────────────────────────────────────────────┤
│ ▾ Workload       │ ┌─ Cost over time ────────────────────────┐    │
│   turns 30 ± 10  │ │                                         │    │
│   user 600 ± 200 │ │  (overlay both configs, p10/p90 band)   │    │
│ ▾ MCP            │ └─────────────────────────────────────────┘    │
│   installed 5    │ ┌─ Coherence Index (heuristic) ──────────┐    │
│   p(use) 30%     │ │                                         │    │
│   [uniform|long] │ └─────────────────────────────────────────┘    │
│ ▾ Skills         │ ┌─ Window utilization (stacked) ─────────┐    │
│   installed 12   │ │  ████ system  ████ mcp  ░░░ skills      │    │
│ ▾ Model          │ │  ░░░░ workload  ████ tool results       │    │
│   ● Sonnet 4.6   │ └─────────────────────────────────────────┘    │
│ ▾ Cache          │                                                 │
│   ☑ enabled      │ Zoom: [ Turn ] [Session] [Day] [Month]         │
│   ttl 5m/1h      │                                                 │
│ ▾ ZDR ☐          │ Presets: [Lean][Solo][Enterprise][No-Cache]    │
│ ▾ Team           │                                                 │
│   users 10       │                                                 │
│   sess/day 4     │                                                 │
│ ▾ Quality        │                                                 │
│ ▾ Compaction     │                                                 │
└──────────────────┴─────────────────────────────────────────────────┘
```

Mobile: panels stack vertically (controls collapse to top-bar drawer).

## URL state encoding

Hash format: `#cfg=<base64url(LZ-compressed JSON)>`. Library: `lz-string` (small, no deps). Stores subscribe to hash changes; mutations debounce-write to hash. Length budget < 2 kB.

## Worker protocol

```ts
// main → worker
{ type: 'simulate', id: number, baseline: Config, variant: Config }

// worker → main
{ type: 'progress', id: number, percent: number }
{ type: 'done', id: number, baseline: RunOutput, variant: RunOutput }
```

Debounced 150 ms in main. Latest `id` wins.

## Presets

| Preset | MCP installed | Skills installed | Cache | Model |
|---|---:|---:|---|---|
| Lean | 0 | 0 | on/5m | Sonnet 4.6 |
| Solo Dev | 2 | 8 | on/5m | Sonnet 4.6 |
| Enterprise Team | 15 | 30 | on/5m | Opus 4.7 |
| No-Cache | 5 | 10 | off | Sonnet 4.6 |
| ZDR + Heavy | 15 | 30 | on (auto-off via ZDR) | Sonnet 4.6 |

## Testing

- `engine/*.test.ts` — unit tests for cost formulas, cache gates, coherence sigmoid, distributions
- `engine/simulate.test.ts` — single-trajectory determinism with fixed seed
- `engine/monteCarlo.test.ts` — aggregation correctness (mean/p10/p90 from known input)
- `state/url.test.ts` — round-trip schema

Smoke target: `npm run check && npm run test`.

## Methodology page

Public-facing `/methodology` route reproducing:
1. Plain-language explanation
2. Formula list
3. Default values + sources
4. Heuristic disclaimers (Coherence is NOT Anthropic-measured)
5. Known limitations (Power-law usage stats unavailable, cache hit-rate is modelled not measured)
6. Links: Anthropic docs (caching, pricing, compaction)

## Out of scope (v1)

- Image/PDF tokens
- Multi-turn cache-stacking beyond 4 breakpoints (modelled as upper bound, not enforced)
- Per-user activation bias vectors
- Skill-stickiness across sessions
- Live API calls to fetch current pricing
- Persistence beyond URL hash
- i18n (UI English, code base English)

## Non-goals

- Not a billing oracle. Not investment advice. Heuristic playground.

<script lang="ts">
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Methodology — Token-Sim</title>
</svelte:head>

<div class="doc">
  <header>
    <a href="{base}/" class="back">← back to simulator</a>
    <h1>Methodology</h1>
    <p class="muted">
      How the math model works, what assumptions it makes, and where the numbers come from.
    </p>
  </header>

  <section>
    <h2>1. What this simulates</h2>
    <p>
      Token-Sim is a Monte Carlo simulator for a single Claude Code session, replicated
      across many trials to expose distributions rather than point estimates. Each MC run
      walks turn-by-turn through a session and accumulates:
    </p>
    <ul>
      <li><b>Cost</b> in USD, split across fresh input, cached read, cache write, and output.</li>
      <li><b>Coherence Index</b> — a heuristic 0–1 score that drops as the context window fills.</li>
      <li><b>Context-window utilization</b> — total tokens / model context window.</li>
    </ul>
    <p class="warn">
      <b>Coherence Index is not an Anthropic-measured metric.</b> It is a parametric sigmoid
      meant to make the well-documented context-rot effect tangible. Treat it as a
      conceptual aid, not a ground-truth score.
    </p>
  </section>

  <section>
    <h2>2. Inputs</h2>
    <p>Most numeric inputs are <code>{`{ mean, sd }`}</code> pairs. The engine draws a
       truncated-normal sample (rejection-sampled, clipped at ≥ 0) on each MC iteration,
       so distributions affect outcome spread, not just averages.</p>
    <p>Three integer-counted inputs use special distributions:</p>
    <ul>
      <li><b>turns/session</b> — truncated-normal, rounded to ≥ 3.</li>
      <li><b>activated MCP servers / skills</b> — Binomial(n, p) if uniform, or Zipf-weighted
         draws if long-tail.</li>
    </ul>
  </section>

  <section>
    <h2>3. Per-turn formulas</h2>
    <h3>Baseline overhead (t = 0)</h3>
    <pre><code>{`overhead = systemPromptTokens
         + baseContextTokens
         + mcpInstalled × avgTokensPerServer
         + skillsInstalled × metadataTokensPerSkill
         + (placement = 'prefix' ? activatedSkills × fullContentTokens : 0)`}</code></pre>

    <h3>Per turn t = 1…T</h3>
    <pre><code>{`newInput  = userInputTokens
          + toolResultTokens
          + mcpCalls[t] × tokensPerCall
          + (placement = 'inline' ? skillTriggers[t] × fullContentTokens : 0)
newOutput = assistantOutputTokens + thinkingTokens
contextTokens[t] = contextTokens[t-1] + newInput + newOutput`}</code></pre>

    <h3>Compaction (window-relative trigger)</h3>
    <p>
      Claude Code auto-compacts when the context fills up enough that there\'s no longer
      room for a full assistant response. The trigger is modelled as a fraction of the
      model\'s context window — default <code>0.92</code>, which on Opus/Haiku (200 k window)
      maps to ~184 k tokens, and on Sonnet 4.6 (1 M window) to ~920 k tokens.
      Switching model rescales the absolute threshold automatically.
    </p>
    <pre><code>{`triggerTokens = compaction.triggerPct × model.ctxWindow
if contextTokens[t] > triggerTokens:
    messagesAfter = (contextTokens[t] - overhead) × retentionFactor
    contextTokens[t] = overhead + messagesAfter + summaryOutputTokens
    coherencePenalty += compaction.qualityPenalty
    cost += summaryOutputTokens × priceOutput / 1e6`}</code></pre>

    <h3>Cache gating</h3>
    <pre><code>{`gap = TruncNormal(interTurnDelaySec)
cacheActive = cache.enabled
            && !zdr
            && overhead ≥ minCacheableTokens
            && gap ≤ ttlSeconds                         // 300 (5m) or 3600 (1h)
            && (t = 1 || prevTurnCacheActive)
            && (placement ≠ 'inline' || !skillTriggeredThisTurn)`}</code></pre>

    <h3>Cost per turn</h3>
    <pre><code>{`if cacheActive:
  if t = 1:                cached = 0;            fresh = newContext - newOutput
  elif compactionTriggered: cached = min(overhead, prevCtx); fresh = ctx - cached - newOutput
  else:                     cached = prevCtx;     fresh = newInput
  cacheWrite = fresh
else:
  cached = 0; fresh = ctx - newOutput; cacheWrite = 0

cost[t] = fresh      × priceInput            / 1e6
        + cached     × priceCacheRead        / 1e6
        + cacheWrite × priceCacheWrite(ttl)  / 1e6
        + newOutput  × priceOutput           / 1e6`}</code></pre>

    <h3>Coherence (heuristic)</h3>
    <pre><code>{`u = contextTokens[t] / model.ctxWindow
sigmoid = 1 / (1 + exp(-(u - decayStartPct) × steepness))
coherence[t] = clamp01( floor + (1-floor) × (1 - sigmoid) - accumulatedPenalty )`}</code></pre>
  </section>

  <section>
    <h2>4. Aggregation across N runs</h2>
    <p>
      For each <code>(turn, metric)</code> we collect N samples, then report
      <b>mean</b>, <b>p10</b>, and <b>p90</b>. The shaded band in each chart is the
      p10–p90 interval; the line is the mean. Increasing the sample size in the
      Monte-Carlo section tightens the bands at the cost of compute time.
    </p>
    <p>
      Team-day and team-month zoom levels multiply per-session cost by
      <code>users × sessionsPerUserPerDay</code> (× 20 working days for month).
      Coherence and window-utilization are session-level metrics and do not aggregate
      across users meaningfully — they are shown unchanged.
    </p>
  </section>

  <section>
    <h2>5. Default pricing (2026-05, approximate)</h2>
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Ctx</th>
          <th>In $/M</th>
          <th>Out $/M</th>
          <th>Cache W (5m)</th>
          <th>Cache W (1h)</th>
          <th>Cache R</th>
          <th>Min-cacheable</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Opus 4.7</td><td>200k</td><td>$15</td><td>$75</td><td>$18.75</td><td>$30</td><td>$1.50</td><td>4096</td></tr>
        <tr><td>Sonnet 4.6</td><td>1M</td><td>$3</td><td>$15</td><td>$3.75</td><td>$6</td><td>$0.30</td><td>1024</td></tr>
        <tr><td>Haiku 4.5</td><td>200k</td><td>$1</td><td>$5</td><td>$1.25</td><td>$2</td><td>$0.10</td><td>4096</td></tr>
      </tbody>
    </table>
    <p class="muted small">
      All values are user-editable. Pricing was approximated at the time of writing —
      consult the Anthropic pricing page for current rates.
    </p>
  </section>

  <section>
    <h2>6. Modeling MCP servers and Skills</h2>
    <p>
      A Claude Code session loads:
    </p>
    <ul>
      <li><b>MCP server schemas</b> — every installed server contributes its tool schema to
         the system prompt at session start, regardless of whether any tool is used.</li>
      <li><b>Skill metadata</b> — name and description are always loaded, full body only on
         trigger.</li>
    </ul>
    <p>
      These costs are fixed per session if they sit in the cacheable prefix, but they
      consume context window unconditionally. Larger installations push compaction
      forward and start coherence decay earlier.
    </p>
    <p>
      The <b>placement</b> setting on skills toggles whether full skill content sits in the
      cacheable prefix (cheap on subsequent turns, but always loaded) or is injected
      mid-session on trigger (expensive on the triggering turn, invalidates messages
      cache from that point on).
    </p>
    <p>
      The <b>distribution</b> setting toggles between uniform activation (each server has
      independent probability p) and a long-tail (Zipf-weighted) draw where a few high-rank
      servers absorb most of the activations. Long-tail is closer to observed real-world
      tool usage, but no public statistics are available — defaults are heuristic.
    </p>
  </section>

  <section>
    <h2>7. Known limitations</h2>
    <ul>
      <li>The model does not yet account for image or PDF tokens.</li>
      <li>Cache breakpoint placement is simplified; Anthropic permits up to 4 breakpoints
         with hierarchical invalidation, here represented as a single per-turn gate.</li>
      <li>Tool-result tokens are modeled as a single distribution rather than per-tool
         (Bash, Read, Write, etc.), which can have very different token sizes.</li>
      <li>Per-user activation bias is not modeled — every session draws afresh, which
         underestimates the real-world stickiness of a developer's favorite tools.</li>
      <li>No live pricing fetch. Numbers can drift.</li>
    </ul>
  </section>

  <section>
    <h2>8. References</h2>
    <ul>
      <li><a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching" target="_blank" rel="noopener">Anthropic — Prompt Caching</a></li>
      <li><a href="https://platform.claude.com/docs/en/build-with-claude/compaction" target="_blank" rel="noopener">Anthropic — Context Compaction</a></li>
      <li><a href="https://platform.claude.com/docs/en/about-claude/pricing" target="_blank" rel="noopener">Anthropic — Pricing</a></li>
      <li><a href="https://code.claude.com/docs/en/costs" target="_blank" rel="noopener">Claude Code — Cost docs</a></li>
      <li><a href="https://research.trychroma.com/context-rot" target="_blank" rel="noopener">Chroma Research — Context Rot</a></li>
    </ul>
  </section>
</div>

<style>
  .doc {
    max-width: 820px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    font-size: 14px;
    line-height: 1.6;
  }
  header { margin-bottom: 2rem; }
  .back {
    display: inline-block;
    margin-bottom: 1rem;
    font-size: 12px;
  }
  h1 { font-size: 22px; margin-bottom: 0.3rem; }
  h2 { font-size: 17px; margin-top: 2rem; margin-bottom: 0.5rem; color: var(--accent); }
  h3 { font-size: 14px; margin-top: 1rem; margin-bottom: 0.4rem; color: var(--fg); }
  section { margin-bottom: 1.5rem; }
  p { margin: 0.5rem 0; }
  .warn {
    border-left: 3px solid var(--warn);
    padding-left: 0.8rem;
    color: var(--fg);
  }
  pre {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.8rem 1rem;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.5;
  }
  code { font-family: var(--mono); }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 0.5rem;
    font-size: 12px;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 0.4rem 0.6rem;
    text-align: left;
  }
  th {
    background: var(--bg-elev);
    color: var(--fg-muted);
    font-weight: 600;
  }
  td:nth-child(n+3) {
    font-family: var(--mono);
    text-align: right;
  }
  ul {
    padding-left: 1.4rem;
  }
  li { margin: 0.25rem 0; }
  .muted { color: var(--fg-muted); }
  .small { font-size: 11px; }
</style>

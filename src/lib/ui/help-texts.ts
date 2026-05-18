// Centralised explanatory copy for the Help component.
// Keep entries short (1-3 sentences) and concrete. No marketing.

export const HELP = {
  workload: {
    section:
      'A single Claude Code session: the user asks → assistant responds → repeat. Each input here is "per session" or "per turn" as labelled.',
    turnsPerSession:
      'How many request/response cycles a session contains. A bug-fix might be 5 turns; a long refactor 50+. Distribution: each Monte Carlo run draws a value from Normal(mean, sd), clipped to ≥ 3.',
    userInputTokens:
      'Tokens the user types each turn (prompt, instructions, pasted snippets). Small for "fix the test", large for "review this PR".',
    assistantOutputTokens:
      'Tokens the model generates per turn (excluding extended thinking). Billed at output price. Long code edits push this high.',
    thinkingTokens:
      'Extended-thinking tokens — the model\'s internal reasoning before answering. Billed as output. Set to 0 if you don\'t use thinking mode.',
    toolResultTokens:
      'Tokens from tool outputs (Bash, Read, Grep, MCP calls) that feed into the next turn as input. Often the LARGEST cost driver in coding sessions — a single `cat large_file.json` can be 20k+ tokens.',
    systemPromptTokens:
      'Tokens in the Claude Code system prompt (instructions, mode rules, environment info). Typically 3–5k. Lives in the cacheable prefix.',
    baseContextTokens:
      'Initial repo context loaded at session start: CLAUDE.md, project structure, README excerpts. Lives in the cacheable prefix.',
    interTurnDelaySec:
      'Seconds between turns (you reading the response, then typing the next request). Gates 5-minute cache validity: if the gap exceeds the TTL, the cache expires and must be re-written next turn.'
  },

  mcp: {
    section:
      'MCP (Model Context Protocol) servers expose tools to Claude Code. Every installed server\'s tool schemas are loaded into the system prompt, consuming context window even when no tool is used.',
    installed:
      'How many MCP servers are configured in this setup. Each contributes its schema to the system prompt unconditionally.',
    avgTokensPerServer:
      'Average size of one server\'s tool schema (descriptions, parameters, examples). 500–3000 tokens is typical; complex servers like GitHub or Slack can be larger.',
    activationProb:
      'Probability that a given installed server is actually used at least once in a session. p=0.3 means ~30% of installed servers see traffic in a given session.',
    usageDistribution:
      'Uniform: every server has the same probability p. Long-tail (Zipf-weighted): a few top servers dominate, most are nearly inactive — closer to real-world tool usage. No public stats exist; defaults are heuristic.',
    longtailExponent:
      'Zipf exponent s. Higher = more concentration (a few servers do almost everything). s ≈ 1.0 = classic Zipf; s = 1.3 is a reasonable real-world starting point.',
    callsWhenActive:
      'When a server IS used, how many tool calls happen in the session. A linter might fire once; a search server many times.',
    tokensPerCall:
      'Average tokens consumed per tool invocation: arguments + result payload that becomes input on the next turn.'
  },

  skills: {
    section:
      'Skills are the Claude Code agent extension system (Anthropic Skills, also called Subagents). Each installed skill\'s metadata (name + description) is always loaded; full content is loaded only when triggered.',
    installed:
      'Number of skills available in the index. All metadata is loaded at session start regardless of whether any is used.',
    metadataTokens:
      'Per-skill metadata tokens always loaded (name, short description, trigger conditions). 100–500 tokens is typical.',
    activationProb:
      'Probability that a given installed skill triggers at least once in a session.',
    fullContentTokens:
      'Skill body size when triggered: instructions, examples, references. Loaded only on activation. 500–10 000+ tokens depending on the skill.',
    placement:
      'Prefix: skill body sits in the cacheable prefix (cheap on subsequent turns, but always loaded — even if unused). Inline: body is injected mid-session on trigger (cheap upfront, but breaks the messages-cache from that point on).'
  },

  model: {
    section:
      'Choose a Claude model. Defaults are approximate as of May 2026; all numbers are editable for what-if scenarios.',
    ctxWindow:
      'Maximum tokens the model can hold in one request. Opus/Haiku: 200k. Sonnet 4.6: 1M. The slider is capped at each model\'s actual published max. Switch model (button row above) to access a different cap. Larger windows allow longer sessions, but quality degrades as the window fills (see Coherence Index).',
    priceInputPerM:
      'USD per million fresh input tokens (uncached). Output is usually 5× this rate.',
    priceOutputPerM:
      'USD per million output tokens (assistant + thinking). The largest unit cost — keeping responses concise saves money.',
    priceCacheWrite5m:
      'USD per million tokens written to the 5-minute prompt cache. Roughly 1.25× input price.',
    priceCacheWrite1h:
      'USD per million tokens written to the 1-hour prompt cache. Roughly 2× input price — pays off only if cache is reused for long.',
    priceCacheRead:
      'USD per million cached tokens read back. Roughly 0.1× input price — the savings driver.',
    minCacheable:
      'Smallest cacheable prefix in tokens. Below this, caching is skipped entirely. Sonnet: 1024. Opus/Haiku: 4096.'
  },

  cache: {
    section:
      'Anthropic Prompt Caching. Stores a prefix of your request server-side so subsequent turns only pay full price for what\'s NEW. Massive cost reduction for repeated long contexts.',
    enabled:
      'Master toggle. Disabling shows the cost shape without caching — useful for comparison.',
    ttl:
      '5 minutes: cheap to write, expires fast. 1 hour: 2× write cost, but stays warm across longer pauses. Pick 5m for active coding, 1h for sessions you walk away from.',
    breakpoints:
      'How many cache breakpoints the prompt uses. Anthropic allows up to 4 — used to cache different prefix tiers (tools / system / messages). More breakpoints = finer cache reuse, but model has diminishing returns past 3.'
  },

  zdr:
    'Zero Data Retention. Disables Anthropic server-side data retention — required by some enterprises for compliance. Side effect: also disables prompt caching, because cache is server-side data. Cost rises sharply.',

  team: {
    section:
      'Scale a single session\'s cost up to a team or org. Aggregation is multiplicative — no team-level effects modeled.',
    users: 'Active developers in the team or org.',
    sessions: 'Average sessions a developer runs per working day. 1–10 is realistic.'
  },

  quality: {
    section:
      'Coherence Index — a HEURISTIC 0–1 score for how well the model maintains task focus. NOT an Anthropic-measured metric. Drops as the context window fills (the "context rot" effect documented by Chroma research).',
    decayStart:
      'Window fill % at which coherence starts to drop. Below this, near-perfect; above, sigmoid decay toward the floor.',
    steepness:
      'How sharply coherence falls past the decay-start threshold. Higher = sharper drop. Conceptual aid only.',
    floor:
      'Minimum coherence value, no matter how full the window. 0.3 means "even at 100 % window, you still get 30 % usable output".'
  },

  compaction: {
    section:
      'When the conversation gets long, Claude Code auto-compacts: it summarizes old messages to free context space. The trigger is a FRACTION of the model\'s context window — typically ~92 %, leaving headroom (~33 k tokens on a 200 k window) for the assistant response. The trigger therefore scales with the model: ~167 k tokens on Opus/Haiku (200 k window), ~920 k on Sonnet 4.6 (1 M window).',
    trigger:
      'Fraction of the model\'s window at which compaction fires. Default 92 % matches Claude Code\'s observed behaviour: the model needs room for one full response (~33 k tokens on small contexts, more on Sonnet). Switching model? The absolute trigger moves with the window — no need to re-tune.',
    retention:
      'After compaction, what fraction of the recent messages is preserved (the rest becomes a summary). 0.2 = "keep about 20 % of recent message bytes, summarize the rest".',
    summaryOutput:
      'Output tokens the model generates to produce the compaction summary itself — billed at output price.',
    qualityPenalty:
      'One-time coherence drop applied each time a compaction fires. The model knows less after a summary than after raw history; this approximates that.'
  },

  mc: {
    section:
      'Monte Carlo: each input distribution is sampled N times to produce an output distribution. More samples = tighter confidence bands but slower compute.',
    samples:
      'How many session trajectories to simulate. 400 is a good balance; 1000+ gives smooth p10/p90 bands.',
    seed:
      'Random-number seed. Same seed + same config = same exact result. Useful when sharing URLs or comparing.'
  },

  general: {
    coherenceTerm:
      'Coherence Index is a HEURISTIC score (0–1) modelling how response quality may degrade as the context window fills. It is NOT a metric Anthropic publishes or measures. Treat it as a conceptual tool to compare configurations, not as ground truth.',
    contextWindow:
      'The maximum number of tokens a model can see in one request. Once full, the model can no longer add new context without dropping old. Auto-compaction kicks in before that to keep some headroom.',
    mcp:
      'Model Context Protocol — Anthropic\'s standard for connecting tools/data sources to Claude. An MCP server exposes tools; Claude Code loads their schemas at session start.',
    skill:
      'Claude Code skills are reusable agent extensions. They\'re indexed by metadata (always loaded) and activated on demand (full body loaded then).',
    zdr:
      'Zero Data Retention — an enterprise compliance flag that prevents Anthropic from retaining request/response data. Side effect: prompt caching is server-side, so ZDR disables it. Often the single biggest cost lever.',
    promptCache:
      'A server-side cache of your prompt prefix. First turn writes the prefix at slight premium; subsequent turns read it at ~10 % of input price. Only viable if the prefix is stable.'
  }
} as const;

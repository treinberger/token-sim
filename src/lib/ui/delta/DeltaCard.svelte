<script lang="ts">
  import { output, dualConfig } from '$lib/state/stores.js';
  import { fmtUsd, fmtPct } from '$lib/ui/charts/utils.js';
  import type { RunOutput } from '$lib/engine/types.js';

  function pctDelta(b: number, v: number): number {
    if (b === 0) return v === 0 ? 0 : Infinity;
    return (v - b) / Math.abs(b);
  }
  function formatPctDelta(d: number): string {
    if (!isFinite(d)) return '∞';
    return `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`;
  }
  function deltaClass(d: number, inverted = false): string {
    const v = inverted ? -d : d;
    if (!isFinite(v)) return 'neutral';
    if (Math.abs(v) < 0.005) return 'neutral';
    return v > 0 ? 'bad' : 'good';
  }

  function summaryFor(zoom: 'turn' | 'session' | 'day' | 'month', out: RunOutput): { cost: number; coh: number; peak: number; cacheHit: number } {
    if (zoom === 'day') {
      return {
        cost: out.zoom.perDay.cost.mean,
        coh: out.summary.meanCoherence.mean,
        peak: out.summary.peakWindowUtil.mean,
        cacheHit: out.summary.cacheHitRatio.mean
      };
    }
    if (zoom === 'month') {
      return {
        cost: out.zoom.perMonth.cost.mean,
        coh: out.summary.meanCoherence.mean,
        peak: out.summary.peakWindowUtil.mean,
        cacheHit: out.summary.cacheHitRatio.mean
      };
    }
    return {
      cost: out.summary.totalCost.mean,
      coh: out.summary.meanCoherence.mean,
      peak: out.summary.peakWindowUtil.mean,
      cacheHit: out.summary.cacheHitRatio.mean
    };
  }
</script>

<div class="delta">
  {#if !$output.baseline}
    <span class="muted">Computing…</span>
  {:else}
    {@const b = $output.baseline}
    {@const v = $output.variant}
    {@const zoom = $dualConfig.zoom}
    {@const sb = summaryFor(zoom, b)}
    {#if v}
      {@const sv = summaryFor(zoom, v)}
      <div class="metric">
        <span class="label">Cost / {zoom}</span>
        <div class="row">
          <span class="chip baseline">{fmtUsd(sb.cost)}</span>
          <span class="chip variant">{fmtUsd(sv.cost)}</span>
          <span class="delta-val {deltaClass(pctDelta(sb.cost, sv.cost))}">
            Δ {formatPctDelta(pctDelta(sb.cost, sv.cost))}
          </span>
        </div>
      </div>
      <div class="metric">
        <span class="label">Coherence (mean)</span>
        <div class="row">
          <span class="chip baseline">{fmtPct(sb.coh)}</span>
          <span class="chip variant">{fmtPct(sv.coh)}</span>
          <span class="delta-val {deltaClass(pctDelta(sb.coh, sv.coh), true)}">
            Δ {formatPctDelta(pctDelta(sb.coh, sv.coh))}
          </span>
        </div>
      </div>
      <div class="metric">
        <span class="label">Peak window</span>
        <div class="row">
          <span class="chip baseline">{fmtPct(sb.peak)}</span>
          <span class="chip variant">{fmtPct(sv.peak)}</span>
          <span class="delta-val {deltaClass(pctDelta(sb.peak, sv.peak))}">
            Δ {formatPctDelta(pctDelta(sb.peak, sv.peak))}
          </span>
        </div>
      </div>
      <div class="metric">
        <span class="label">Cache-hit ratio</span>
        <div class="row">
          <span class="chip baseline">{fmtPct(sb.cacheHit)}</span>
          <span class="chip variant">{fmtPct(sv.cacheHit)}</span>
          <span class="delta-val {deltaClass(pctDelta(sb.cacheHit, sv.cacheHit), true)}">
            Δ {formatPctDelta(pctDelta(sb.cacheHit, sv.cacheHit))}
          </span>
        </div>
      </div>
    {:else}
      <div class="metric">
        <span class="label">Cost / {zoom}</span>
        <div class="row"><span class="chip baseline">{fmtUsd(sb.cost)}</span></div>
      </div>
      <div class="metric">
        <span class="label">Coherence</span>
        <div class="row"><span class="chip baseline">{fmtPct(sb.coh)}</span></div>
      </div>
      <div class="metric">
        <span class="label">Peak window</span>
        <div class="row"><span class="chip baseline">{fmtPct(sb.peak)}</span></div>
      </div>
      <div class="metric">
        <span class="label">Cache-hit ratio</span>
        <div class="row"><span class="chip baseline">{fmtPct(sb.cacheHit)}</span></div>
      </div>
    {/if}
    {#if $output.computing}
      <span class="muted small">computing…</span>
    {/if}
  {/if}
</div>

<style>
  .delta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.6rem 0.8rem;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    align-items: center;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 130px;
  }
  .label {
    font-size: 11px;
    color: var(--fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .delta-val {
    font-family: var(--mono);
    font-size: 11px;
  }
  .delta-val.good { color: var(--good); }
  .delta-val.bad { color: var(--bad); }
  .delta-val.neutral { color: var(--fg-muted); }
</style>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { dualConfig, output, installUrlSync } from '$lib/state/stores.js';
  import { installComputeLoop } from '$lib/state/runner.js';
  import InputPanel from '$lib/ui/panels/InputPanel.svelte';
  import LineChart from '$lib/ui/charts/LineChart.svelte';
  import OverheadBar from '$lib/ui/charts/OverheadBar.svelte';
  import DeltaCard from '$lib/ui/delta/DeltaCard.svelte';
  import ConfigSwitcher from '$lib/ui/ConfigSwitcher.svelte';
  import ZoomSelector from '$lib/ui/ZoomSelector.svelte';
  import PresetGallery from '$lib/ui/PresetGallery.svelte';
  import MetaStats from '$lib/ui/MetaStats.svelte';
  import { pickSeries, cumulative, fmtUsd, fmtPct } from '$lib/ui/charts/utils.js';
  import { newIssueUrl, REPO_URL } from '$lib/feedback.js';

  let cleanupUrl: (() => void) | null = null;
  let cleanupCompute: (() => void) | null = null;

  onMount(() => {
    cleanupUrl = installUrlSync();
    cleanupCompute = installComputeLoop();
  });

  onDestroy(() => {
    cleanupUrl?.();
    cleanupCompute?.();
  });

  const baselineCost = $derived(
    $dualConfig.zoom === 'turn'
      ? pickSeries($output.baseline, 'cost')
      : cumulative(pickSeries($output.baseline, 'cost'))
  );
  const variantCost = $derived(
    $dualConfig.compareEnabled
      ? $dualConfig.zoom === 'turn'
        ? pickSeries($output.variant, 'cost')
        : cumulative(pickSeries($output.variant, 'cost'))
      : null
  );

  const baselineCoh = $derived(pickSeries($output.baseline, 'coherence'));
  const variantCoh = $derived(
    $dualConfig.compareEnabled ? pickSeries($output.variant, 'coherence') : null
  );

  const baselineWin = $derived(pickSeries($output.baseline, 'windowUtil'));
  const variantWin = $derived(
    $dualConfig.compareEnabled ? pickSeries($output.variant, 'windowUtil') : null
  );

  const costTitle = $derived(
    $dualConfig.zoom === 'turn' ? 'Cost per turn ($)' : 'Cumulative session cost ($)'
  );

  // Compaction trigger is a fraction of the baseline model's window.
  const compactionThresholdBaseline = $derived($dualConfig.baseline.compaction.triggerPct);
  const decayStartBaseline = $derived($dualConfig.baseline.quality.decayStartPct);

  function fmtCtx(v: number): string {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  }
  const compactionLabel = $derived(
    `compaction @ ${(compactionThresholdBaseline * 100).toFixed(0)}% = ${fmtCtx(compactionThresholdBaseline * $dualConfig.baseline.model.ctxWindow)} of ${fmtCtx($dualConfig.baseline.model.ctxWindow)}`
  );
</script>

<svelte:head>
  <title>Token-Sim — Claude Code Cost & Quality Simulator</title>
</svelte:head>

<div class="app">
  <div class="topbar">
    <header>
      <h1>τ Token-Sim</h1>
      <span class="tagline muted small">
        Browser-only Monte Carlo simulator — Claude Code costs, coherence (heuristic), context window
      </span>
    </header>

    <ConfigSwitcher />
    <DeltaCard />
  </div>

  <div class="main">
    <InputPanel />
    <div class="charts">
      <div class="charts-head">
        <ZoomSelector />
        {#if $output.computing}
          <span class="small dim">computing… {Math.round(($output.progress.baseline + $output.progress.variant) / ($dualConfig.compareEnabled ? 2 : 1))}%</span>
        {/if}
      </div>

      <div class="charts-body">
        <div class="overhead-row">
          <OverheadBar cfg={$dualConfig.baseline} label="Baseline" />
          {#if $dualConfig.compareEnabled}
            <OverheadBar cfg={$dualConfig.variant} label="Variant" />
          {/if}
        </div>

        <LineChart
          baseline={baselineCost}
          variant={variantCost}
          title={costTitle}
          yLabel="$"
          yFmt={fmtUsd}
          yMin={0}
        />

        <LineChart
          baseline={baselineCoh}
          variant={variantCoh}
          title="Coherence Index (heuristic, 0–1)"
          yLabel=""
          yFmt={fmtPct}
          yMin={0}
          yMax={1}
          thresholds={[{ value: decayStartBaseline, label: 'decay starts', color: 'var(--warn)' }]}
        />

        <LineChart
          baseline={baselineWin}
          variant={variantWin}
          title="Context-window utilization"
          yLabel="% of model context window"
          yFmt={fmtPct}
          yMin={0}
          yMax={Math.max(1, compactionThresholdBaseline + 0.1)}
          thresholds={[
            { value: compactionThresholdBaseline, label: compactionLabel, color: 'var(--bad)' },
            { value: decayStartBaseline, label: 'coherence decay starts', color: 'var(--warn)' }
          ]}
        />
      </div>

      <MetaStats />
      <PresetGallery />
    </div>
  </div>

  <footer>
    <span class="small muted">
      Heuristic playground. Coherence index and usage statistics are best-effort estimates,
      not Anthropic-measured. See
      <a href="methodology">methodology</a> for assumptions and sources.
    </span>
    <span class="footer-links small">
      <a href={newIssueUrl('math')} target="_blank" rel="noopener noreferrer">
        Report math bug
      </a>
      <span class="sep">·</span>
      <a href={newIssueUrl('ux')} target="_blank" rel="noopener noreferrer">
        UX feedback
      </a>
      <span class="sep">·</span>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
    </span>
  </footer>
</div>

<style>
  :global(html, body) {
    height: 100%;
    overflow: hidden;
  }
  .app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
  }
  .topbar {
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    z-index: 20;
    /* implicit row 1 of .app grid — stays at the top */
  }
  header {
    padding: 0.7rem 1rem;
    display: flex;
    gap: 1rem;
    align-items: baseline;
    border-bottom: 1px solid var(--border);
  }
  h1 {
    font-size: 17px;
    color: var(--accent);
  }
  .tagline {
    color: var(--fg-muted);
  }
  .main {
    display: grid;
    grid-template-columns: 320px 1fr;
    align-items: start;
    overflow-y: auto;
    min-height: 0;
  }
  .charts {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    min-width: 0;
    max-height: 100%;
    overflow-y: auto;
  }
  .charts-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.8rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elev);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .charts-body {
    padding: 0.6rem 0.8rem;
  }
  .overhead-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }
  footer {
    padding: 0.5rem 0.8rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elev);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    justify-content: space-between;
    align-items: center;
  }
  .footer-links {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .footer-links .sep { color: var(--fg-dim); }

  @media (max-width: 800px) {
    .main {
      grid-template-columns: 1fr;
    }
    .charts {
      position: static;
      max-height: none;
      overflow-y: visible;
    }
  }
</style>

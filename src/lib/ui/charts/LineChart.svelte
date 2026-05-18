<script lang="ts">
  import * as d3 from 'd3';

  type Series = { turn: number; mean: number; p10: number; p90: number };

  type Props = {
    baseline: Series[];
    variant: Series[] | null;
    title: string;
    yLabel?: string;
    yFmt?: (v: number) => string;
    yMin?: number;
    yMax?: number;
    height?: number;
    thresholds?: { value: number; label: string; color?: string }[];
  };
  let {
    baseline,
    variant,
    title,
    yLabel = '',
    yFmt = (v: number) => v.toFixed(2),
    yMin,
    yMax,
    height = 200,
    thresholds = []
  }: Props = $props();

  let containerWidth = $state(600);
  let container: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 600;
      containerWidth = Math.max(300, w);
    });
    ro.observe(container);
    return () => ro.disconnect();
  });

  const margin = { top: 10, right: 16, bottom: 28, left: 50 };
  const plotW = $derived(containerWidth - margin.left - margin.right);
  const plotH = $derived(height - margin.top - margin.bottom);

  const allSeries = $derived([...baseline, ...(variant ?? [])]);

  const xExtent = $derived(
    allSeries.length === 0 ? [0, 1] : d3.extent(allSeries, (d) => d.turn) as [number, number]
  );

  const yExtent = $derived.by(() => {
    if (allSeries.length === 0) return [0, 1] as [number, number];
    const lo = yMin ?? Math.min(0, d3.min(allSeries, (d) => d.p10) ?? 0);
    const hi = yMax ?? d3.max(allSeries, (d) => d.p90) ?? 1;
    const pad = (hi - lo) * 0.05;
    return [lo, hi + pad] as [number, number];
  });

  const xScale = $derived(
    d3.scaleLinear().domain(xExtent).range([0, plotW])
  );
  const yScale = $derived(
    d3.scaleLinear().domain(yExtent).range([plotH, 0])
  );

  const lineGen = $derived(
    d3
      .line<Series>()
      .x((d) => xScale(d.turn))
      .y((d) => yScale(d.mean))
      .curve(d3.curveMonotoneX)
  );

  const areaGen = $derived(
    d3
      .area<Series>()
      .x((d) => xScale(d.turn))
      .y0((d) => yScale(d.p10))
      .y1((d) => yScale(d.p90))
      .curve(d3.curveMonotoneX)
  );

  const yTicks = $derived(yScale.ticks(5));
  const xTicks = $derived(xScale.ticks(Math.min(8, xExtent[1] - xExtent[0])));

  const baselinePath = $derived(baseline.length ? lineGen(baseline) ?? '' : '');
  const baselineArea = $derived(baseline.length ? areaGen(baseline) ?? '' : '');
  const variantPath = $derived(variant && variant.length ? lineGen(variant) ?? '' : '');
  const variantArea = $derived(variant && variant.length ? areaGen(variant) ?? '' : '');
</script>

<div class="chart-card" bind:this={container}>
  <div class="title-row">
    <h3>{title}</h3>
    {#if yLabel}<span class="ylabel mono small muted">{yLabel}</span>{/if}
  </div>
  <svg width={containerWidth} {height} role="img" aria-label={title}>
    <g transform={`translate(${margin.left},${margin.top})`}>
      <!-- grid -->
      {#each yTicks as t}
        <line
          x1={0}
          x2={plotW}
          y1={yScale(t)}
          y2={yScale(t)}
          stroke="var(--border)"
          stroke-width="0.5"
        />
        <text
          x={-6}
          y={yScale(t)}
          text-anchor="end"
          dominant-baseline="middle"
          fill="var(--fg-muted)"
          font-size="10"
          font-family="var(--mono)"
        >{yFmt(t)}</text>
      {/each}
      <!-- x-axis -->
      <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="var(--border-strong)" />
      {#each xTicks as t}
        <text
          x={xScale(t)}
          y={plotH + 14}
          text-anchor="middle"
          fill="var(--fg-muted)"
          font-size="10"
          font-family="var(--mono)"
        >{t}</text>
      {/each}
      <text
        x={plotW / 2}
        y={plotH + 26}
        text-anchor="middle"
        fill="var(--fg-dim)"
        font-size="10"
      >turn</text>
      <!-- threshold lines -->
      {#each thresholds as th}
        {#if th.value >= yExtent[0] && th.value <= yExtent[1]}
          <line
            x1={0}
            x2={plotW}
            y1={yScale(th.value)}
            y2={yScale(th.value)}
            stroke={th.color ?? 'var(--bad)'}
            stroke-width="1"
            stroke-dasharray="3 3"
            opacity="0.6"
          />
          <text
            x={plotW - 4}
            y={yScale(th.value) - 4}
            text-anchor="end"
            fill={th.color ?? 'var(--bad)'}
            font-size="10"
            font-family="var(--mono)"
            opacity="0.8"
          >{th.label}</text>
        {/if}
      {/each}
      <!-- baseline -->
      {#if baselineArea}
        <path d={baselineArea} fill="var(--baseline)" fill-opacity="0.15" />
      {/if}
      {#if baselinePath}
        <path d={baselinePath} fill="none" stroke="var(--baseline)" stroke-width="2" />
      {/if}
      <!-- variant -->
      {#if variantArea}
        <path d={variantArea} fill="var(--variant)" fill-opacity="0.15" />
      {/if}
      {#if variantPath}
        <path d={variantPath} fill="none" stroke="var(--variant)" stroke-width="2" />
      {/if}
    </g>
  </svg>
</div>

<style>
  .chart-card {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.7rem 0.8rem 0.4rem;
    margin-bottom: 0.6rem;
  }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.3rem;
  }
  h3 {
    font-size: 13px;
    color: var(--fg);
  }
  .ylabel {
    color: var(--fg-dim);
  }
  svg {
    display: block;
    overflow: visible;
  }
</style>

<script lang="ts">
  import Slider from './Slider.svelte';
  import Help from '../Help.svelte';
  import type { MeanSd } from '$lib/engine/types.js';

  type Props = {
    label: string;
    value: MeanSd;
    minMean?: number;
    maxMean?: number;
    step?: number;
    sdMax?: number;
    suffix?: string;
    help?: string;
    onchange: (v: MeanSd) => void;
  };
  let {
    label,
    value,
    minMean = 0,
    maxMean = 1000,
    step = 1,
    sdMax,
    suffix = '',
    help,
    onchange
  }: Props = $props();

  const effectiveSdMax = $derived(sdMax ?? Math.max(maxMean * 0.6, value.mean * 0.6));
</script>

<div class="meansd">
  <div class="title">
    {label}
    {#if help}<Help text={help} title={label} />{/if}
  </div>
  <Slider
    label="mean"
    value={value.mean}
    min={minMean}
    max={maxMean}
    {step}
    {suffix}
    onchange={(m) => onchange({ ...value, mean: m })}
  />
  <Slider
    label="sd"
    value={value.sd}
    min={0}
    max={effectiveSdMax}
    {step}
    {suffix}
    onchange={(s) => onchange({ ...value, sd: s })}
  />
</div>

<style>
  .meansd {
    margin-bottom: 0.8rem;
    padding: 0.4rem 0.5rem;
    background: var(--bg-elev);
    border-radius: 3px;
    border-left: 2px solid var(--border);
  }
  .title {
    font-size: 11px;
    color: var(--fg);
    margin-bottom: 0.3rem;
    font-weight: 600;
  }
</style>

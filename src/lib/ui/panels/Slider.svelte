<script lang="ts">
  import Help from '../Help.svelte';

  type Props = {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    fmt?: (v: number) => string;
    help?: string;
    helpTitle?: string;
    onchange: (v: number) => void;
  };
  let {
    label,
    value,
    min,
    max,
    step = 1,
    suffix = '',
    fmt,
    help,
    helpTitle,
    onchange
  }: Props = $props();

  const display = $derived(fmt ? fmt(value) : `${value}${suffix}`);
</script>

<div class="slider-row">
  <div class="slider-head">
    <span class="lbl">
      {label}
      {#if help}<Help text={help} title={helpTitle ?? label} />{/if}
    </span>
    <span class="val mono">{display}</span>
  </div>
  <div class="slider-controls">
    <input
      type="range"
      {min}
      {max}
      {step}
      {value}
      oninput={(e) => onchange(+(e.currentTarget as HTMLInputElement).value)}
    />
    <input
      type="number"
      {min}
      {max}
      {step}
      {value}
      onchange={(e) => onchange(+(e.currentTarget as HTMLInputElement).value)}
    />
  </div>
</div>

<style>
  .slider-row {
    margin-bottom: 0.55rem;
  }
  .slider-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.15rem;
  }
  .lbl { font-size: 11px; color: var(--fg-muted); }
  .val { font-size: 11px; color: var(--fg); }
  .slider-controls { display: flex; gap: 0.4rem; align-items: center; }
  .slider-controls input[type="range"] { flex: 1; }
  .slider-controls input[type="number"] { width: 64px; }
</style>

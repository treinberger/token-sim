<script lang="ts">
  import { PRESETS } from '$lib/data/presets.js';
  import { dualConfig, setActiveTo } from '$lib/state/stores.js';
</script>

<div class="presets">
  <span class="lbl small muted">Apply preset to {$dualConfig.active}</span>
  <div class="row">
    {#each PRESETS as p}
      <button
        class="preset"
        title={p.description}
        onclick={() => setActiveTo(p.config())}
      >{p.label}</button>
    {/each}
  </div>
</div>

<style>
  .presets {
    padding: 0.5rem 0.8rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elev);
  }
  .lbl {
    display: block;
    margin-bottom: 0.3rem;
  }
  .row {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .preset {
    font-size: 12px;
  }
</style>

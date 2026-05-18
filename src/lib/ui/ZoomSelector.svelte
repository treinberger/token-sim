<script lang="ts">
  import { dualConfig, setZoom } from '$lib/state/stores.js';
  import type { DualConfig } from '$lib/state/schema.js';

  const zooms: { id: DualConfig['zoom']; label: string }[] = [
    { id: 'turn', label: 'Turn' },
    { id: 'session', label: 'Session' },
    { id: 'day', label: 'Day' },
    { id: 'month', label: 'Month' }
  ];
</script>

<div class="zoom">
  <span class="lbl small muted">Zoom</span>
  {#each zooms as z}
    <button
      class="toggle"
      class:on={$dualConfig.zoom === z.id}
      onclick={() => setZoom(z.id)}
    >{z.label}</button>
  {/each}
</div>

<style>
  .zoom {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .lbl {
    margin-right: 0.3rem;
  }
</style>

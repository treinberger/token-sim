<script lang="ts">
  import { dualConfig, setActive, copyActiveToOther, toggleCompare, shareableUrl } from '$lib/state/stores.js';

  let copied = $state(false);

  async function share(): Promise<void> {
    const url = shareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // ignore
    }
  }
</script>

<div class="switcher">
  <div class="group">
    <button
      class="toggle"
      class:on={$dualConfig.active === 'baseline'}
      onclick={() => setActive('baseline')}
      title="Edit baseline config"
    >
      <span class="dot baseline"></span> Baseline
    </button>
    <button
      class="toggle"
      class:on={$dualConfig.active === 'variant'}
      disabled={!$dualConfig.compareEnabled}
      onclick={() => setActive('variant')}
      title="Edit variant config"
    >
      <span class="dot variant"></span> Variant
    </button>
  </div>

  <div class="group">
    <button onclick={toggleCompare} title="Show both configurations">
      {$dualConfig.compareEnabled ? '☑' : '☐'} Compare A/B
    </button>
    <button onclick={copyActiveToOther} title="Copy active config to the other side" disabled={!$dualConfig.compareEnabled}>
      Copy {$dualConfig.active} → other
    </button>
  </div>

  <div class="group push-right">
    <button onclick={share} class:primary={copied}>
      {copied ? 'URL copied ✓' : 'Share URL'}
    </button>
    <a href="methodology" class="meth">Methodology →</a>
  </div>
</div>

<style>
  .switcher {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    padding: 0.5rem 0.8rem;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .group {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .push-right { margin-left: auto; }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.3rem;
    vertical-align: middle;
  }
  .dot.baseline { background: var(--baseline); }
  .dot.variant { background: var(--variant); }
  .meth {
    font-size: 12px;
    padding: 0.4em 0.6em;
  }
</style>

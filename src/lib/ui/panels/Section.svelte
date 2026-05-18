<script lang="ts">
  import Help from '../Help.svelte';

  type Props = {
    title: string;
    summary?: string;
    open?: boolean;
    help?: string;
    helpTitle?: string;
    children?: any;
  };
  let {
    title,
    summary = '',
    open = $bindable(true),
    help,
    helpTitle,
    children
  }: Props = $props();
</script>

<details bind:open class="section">
  <summary>
    <span class="title">
      {title}
      {#if help}<Help text={help} title={helpTitle ?? title} />{/if}
    </span>
    {#if summary}<span class="summary">{summary}</span>{/if}
  </summary>
  <div class="body">
    {@render children?.()}
  </div>
</details>

<style>
  .section {
    border-bottom: 1px solid var(--border);
  }
  summary {
    cursor: pointer;
    padding: 0.55rem 0.75rem;
    background: var(--bg-elev);
    user-select: none;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 12px;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before {
    content: '▸';
    color: var(--fg-dim);
    margin-right: 0.4rem;
    transition: transform 0.1s;
  }
  details[open] summary::before {
    content: '▾';
  }
  .title {
    flex: 1;
    color: var(--fg);
    font-weight: 600;
  }
  .summary {
    color: var(--fg-muted);
    font-family: var(--mono);
    font-size: 11px;
  }
  .body {
    padding: 0.75rem 0.75rem 1rem;
    background: var(--bg);
  }
</style>

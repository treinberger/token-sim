<script lang="ts">
  type Props = {
    text: string;
    title?: string;
    icon?: 'question' | 'info';
    children?: any;
  };
  let { text, title, icon = 'question', children }: Props = $props();

  let open = $state(false);
  let host: HTMLSpanElement | undefined = $state();

  function close(e: MouseEvent): void {
    if (!host) return;
    if (!host.contains(e.target as Node)) open = false;
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', close, true);
      return () => document.removeEventListener('click', close, true);
    }
  });
</script>

<span class="help" bind:this={host}>
  <button
    type="button"
    class="trigger"
    aria-label={title ?? 'help'}
    onclick={(e) => { e.stopPropagation(); open = !open; }}
    onmouseenter={() => (open = true)}
    onmouseleave={(e) => {
      // close only if pointer doesn't move onto the popover
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (host && related && host.contains(related)) return;
      open = false;
    }}
  >{icon === 'info' ? 'i' : '?'}</button>
  {#if open}
    <span class="pop" role="tooltip">
      {#if title}<span class="title">{title}</span>{/if}
      <span class="body">{text}</span>
      {#if children}<span class="extra">{@render children()}</span>{/if}
    </span>
  {/if}
</span>

<style>
  .help {
    display: inline-flex;
    position: relative;
    margin-left: 0.3em;
    vertical-align: middle;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    padding: 0;
    border-radius: 50%;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    color: var(--fg-muted);
    font-size: 9px;
    font-family: var(--mono);
    font-weight: 600;
    cursor: help;
    line-height: 1;
  }
  .trigger:hover {
    background: var(--accent-dim);
    color: #fff;
    border-color: var(--accent);
  }
  .pop {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    max-width: 90vw;
    padding: 0.6rem 0.75rem;
    background: var(--bg-elev-3);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font-size: 12px;
    color: var(--fg);
    line-height: 1.5;
    text-align: left;
    text-transform: none;
    letter-spacing: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    pointer-events: auto;
  }
  .pop::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: var(--bg-elev-3);
    border-top: 1px solid var(--border-strong);
    border-left: 1px solid var(--border-strong);
  }
  .title {
    font-weight: 600;
    color: var(--accent);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .body { color: var(--fg); }
  .extra { color: var(--fg-muted); font-size: 11px; }

  @media (max-width: 600px) {
    .pop {
      width: 240px;
    }
  }
</style>

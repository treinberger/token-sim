import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// PUBLIC_REPO_URL is set at build time by the GH-Pages workflow.
// Fallback is generic so local dev still works without env config.
export const REPO_URL: string =
  env.PUBLIC_REPO_URL && env.PUBLIC_REPO_URL.length > 0
    ? env.PUBLIC_REPO_URL
    : 'https://github.com/treinberger/token-sim';

export type FeedbackKind = 'math' | 'ux';

function currentUrl(): string {
  if (!browser) return '';
  return window.location.href;
}

export function newIssueUrl(kind: FeedbackKind): string {
  const template = kind === 'math' ? 'math-bug.yml' : 'ux-feedback.yml';
  const cfgUrl = currentUrl();
  const params = new URLSearchParams({
    template,
    'config-url': cfgUrl
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function newDiscussionUrl(): string {
  return `${REPO_URL}/discussions`;
}

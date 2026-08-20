function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scrolls a newly appeared result or error into view, optionally moving focus to it. */
export function revealResult(el: HTMLElement | null, options: { focus?: boolean } = {}): void {
  if (!el) return

  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  if (options.focus && typeof el.focus === 'function') {
    el.focus({ preventScroll: true })
  }
}

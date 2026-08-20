function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scrolls a newly appeared result or error into view, optionally moving focus to it.
 *
 * A smooth scroll and an immediate focus() call don't mix: focusing an element
 * while its scrollIntoView animation is still in flight cancels the animation
 * partway, so the element never actually reaches the viewport. Whenever focus
 * is also requested, the scroll uses 'auto' (an instant jump) instead.
 */
export function revealResult(el: HTMLElement | null, options: { focus?: boolean } = {}): void {
  if (!el) return

  const behavior = options.focus || prefersReducedMotion() ? 'auto' : 'smooth'

  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior, block: 'start' })
  }

  if (options.focus && typeof el.focus === 'function') {
    el.focus({ preventScroll: true })
  }
}

/**
 * Scrolls a newly appeared result or error into view, optionally moving focus to it.
 *
 * Always scrolls instantly ('auto'). A prior 'smooth' path (used whenever focus
 * wasn't also requested) never actually reached the target in real browsers:
 * something in the surrounding re-render cancels the in-flight animation before
 * it completes, silently leaving the viewport unscrolled. 'auto' has no
 * animation to cancel.
 */
export function revealResult(el: HTMLElement | null, options: { focus?: boolean } = {}): void {
  if (!el) return

  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  if (options.focus && typeof el.focus === 'function') {
    el.focus({ preventScroll: true })
  }
}

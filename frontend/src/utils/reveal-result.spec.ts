import { describe, it, expect, vi } from 'vitest'
import { revealResult } from './reveal-result'

function makeElement(): HTMLElement {
  const el = document.createElement('div')
  el.scrollIntoView = vi.fn()
  el.focus = vi.fn()
  return el
}

describe('revealResult', () => {
  it('does nothing when passed null', () => {
    expect(() => revealResult(null)).not.toThrow()
  })

  it('scrolls the element into view without focusing it by default', () => {
    const el = makeElement()
    revealResult(el)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(el.focus).not.toHaveBeenCalled()
  })

  it('focuses the element when focus: true is passed', () => {
    const el = makeElement()
    revealResult(el, { focus: true })
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('always scrolls instantly, whether or not focus is requested', () => {
    const el = makeElement()
    revealResult(el, { focus: true })
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('does not throw when scrollIntoView is unavailable', () => {
    const el = document.createElement('div')
    el.focus = vi.fn()
    expect(() => revealResult(el)).not.toThrow()
  })
})

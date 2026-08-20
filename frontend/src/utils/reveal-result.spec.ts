import { describe, it, expect, vi, afterEach } from 'vitest'
import { revealResult } from './reveal-result'

function makeElement(): HTMLElement {
  const el = document.createElement('div')
  el.scrollIntoView = vi.fn()
  el.focus = vi.fn()
  return el
}

describe('revealResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when passed null', () => {
    expect(() => revealResult(null)).not.toThrow()
  })

  it('scrolls the element into view without focusing it by default', () => {
    const el = makeElement()
    revealResult(el)
    expect(el.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }))
    expect(el.focus).not.toHaveBeenCalled()
  })

  it('focuses the element when focus: true is passed', () => {
    const el = makeElement()
    revealResult(el, { focus: true })
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('scrolls smoothly when the user has no reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    const el = makeElement()
    revealResult(el)
    expect(el.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })

  it('scrolls instantly when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const el = makeElement()
    revealResult(el)
    expect(el.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it('scrolls instantly when focus is requested, even with no reduced-motion preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    const el = makeElement()
    revealResult(el, { focus: true })
    expect(el.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it('does not throw when scrollIntoView is unavailable', () => {
    const el = document.createElement('div')
    el.focus = vi.fn()
    expect(() => revealResult(el)).not.toThrow()
  })
})

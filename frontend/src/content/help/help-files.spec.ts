import { describe, it, expect } from 'vitest'
import { SUPPORTED_LOCALES } from '../../i18n/locale'
import { HELP_SECTIONS } from './sections'

const helpFiles = import.meta.glob<string>('./*.md', { query: '?raw', import: 'default', eager: true })

function anchorsOf(markdown: string): string[] {
  return [...markdown.matchAll(/\{#([a-z0-9-]+)\}/g)].map((match) => match[1])
}

describe('help files', () => {
  it.each(SUPPORTED_LOCALES)('has a help file for the %s locale', (locale) => {
    expect(helpFiles[`./${locale}.md`]).toBeDefined()
  })

  it.each(SUPPORTED_LOCALES)('defines exactly the HELP_SECTIONS anchors in %s.md, in order', (locale) => {
    expect(anchorsOf(helpFiles[`./${locale}.md`] ?? '')).toEqual([...HELP_SECTIONS])
  })
})

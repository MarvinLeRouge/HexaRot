import { describe, it, expect } from 'vitest'
import en from './en.json'
import fr from './fr.json'

type Messages = { [key: string]: string | Messages }

function flatten(messages: Messages, prefix = ''): Record<string, string> {
  return Object.entries(messages).reduce<Record<string, string>>((flat, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string'
      ? { ...flat, [path]: value }
      : { ...flat, ...flatten(value, path) }
  }, {})
}

function namedParameters(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

const reference = flatten(en)

describe.each([['fr', fr]])('locale file %s', (_name, messages) => {
  const translated = flatten(messages as Messages)

  it('has exactly the same keys as en.json', () => {
    expect(Object.keys(translated).sort()).toEqual(Object.keys(reference).sort())
  })

  it('uses exactly the same named parameters as en.json in every message', () => {
    for (const [key, message] of Object.entries(reference)) {
      expect(namedParameters(translated[key] ?? ''), key).toEqual(namedParameters(message))
    }
  })
})

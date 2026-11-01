import { afterEach, describe, expect, it } from 'vitest'
import { initLocale, resolveInitialLocale } from '@/lib/core/initial-locale'

describe('resolveInitialLocale', () => {
  it('?lang=en hat Vorrang vor gespeicherter Sprache', () => {
    expect(resolveInitialLocale('?lang=en', 'de')).toBe('en')
    expect(resolveInitialLocale('?source=x&lang=de', 'en')).toBe('de')
  })

  it('ohne gültigen Parameter gilt die gespeicherte Sprache, sonst Deutsch', () => {
    expect(resolveInitialLocale('', 'en')).toBe('en')
    expect(resolveInitialLocale('?lang=fr', 'en')).toBe('en')
    expect(resolveInitialLocale('', null)).toBe('de')
    expect(resolveInitialLocale('', 'xx')).toBe('de')
  })
})

describe('initLocale', () => {
  afterEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('übernimmt ?lang=en ohne gespeicherte Sprache (Googlebot) und speichert sie', () => {
    window.history.replaceState(null, '', '/?lang=en')
    expect(initLocale()).toBe('en')
    expect(localStorage.getItem('locale')).toBe('en')
  })

  it('bleibt ohne Parameter bei der gespeicherten Sprache', () => {
    localStorage.setItem('locale', 'en')
    expect(initLocale()).toBe('en')
  })
})

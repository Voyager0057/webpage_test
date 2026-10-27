import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import english from './locales/en.json';
import backendEnglish from './locales/backend-en.json';

export type Locale = 'zh' | 'en';
export type Translator = (message: string | undefined, values?: readonly unknown[]) => string;
const dictionary: Record<string, string> = { ...english, ...backendEnglish };
const languageKey = 'homewise.language';

function interpolate(message: string, values: readonly unknown[]): string {
  return message.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''));
}

/** Display-only localization: raw financial API results and exported input keys stay unchanged. */
export function translate(locale: Locale, message: string | undefined, values: readonly unknown[] = []): string {
  if (!message) return '';
  if (locale === 'zh') return interpolate(message, values);
  const exact = dictionary[message] ?? dictionary[message.trim()];
  if (exact !== undefined) return interpolate(exact, values.map((value) => typeof value === 'string' ? translate(locale, value) : value));
  const patterns: [RegExp, string][] = [
    [/^相比原方案，测算年度生活支出后现金变化 (.+) 元；全期总利息变化 (.+) 元。$/, 'Compared with baseline, annual disposable cash changes by CNY $1; lifetime interest changes by CNY $2.'],
    [/^期限 (.+) → (.+) 年，公积金贷款 (.+) → (.+) 元。$/, 'Loan term: $1 → $2 years. Provident-fund borrowing: CNY $3 → CNY $4.'],
    [/^输入匹配官方首套利率参考档，已按期限自动适配为(.+)%；有效输入快照保留调整后的利率。$/, 'The official first-home reference rate was adjusted for the loan term to $1%. The effective input snapshot retains this rate.'],
    [/^方案 (\d+)$/, 'Plan $1'],
    [/^推荐方案 (\d+)$/, 'Recommended plan $1'],
    [/^(.+) 不能为空$/, '$1 is required'],
    [/^(.+) 必须为有效非负数，最多10位小数且不超过10亿元$/, '$1 must be a non-negative decimal with at most 10 decimal places and no more than CNY 1 billion'],
    [/^(.+) 超出允许范围 0–(.+)$/, '$1 is outside the permitted range 0–$2'],
  ];
  for (const [pattern, replacement] of patterns) {
    const match = message.match(pattern);
    if (match) return replacement.replace(/\$(\d+)/g, (_, index: string) => translate('en', match[Number(index)]));
  }
  if (message.includes('；') || message.includes(' · ')) {
    return message.split(/(；| · )/).map((part) => part === '；' ? '; ' : part === ' · ' ? part : translate('en', part, values)).join('');
  }
  return interpolate(message, values);
}

interface I18nValue { locale: Locale; setLocale: (locale: Locale) => void; t: Translator }
const I18nContext = createContext<I18nValue | null>(null);
function initialLocale(): Locale {
  try { return localStorage.getItem(languageKey) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const setLocale = useCallback((value: Locale) => {
    updateLocale(value);
    try { localStorage.setItem(languageKey, value); } catch { /* Preference storage may be blocked. */ }
  }, []);
  const t = useCallback<Translator>((message, values) => translate(locale, message, values), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    document.documentElement.dataset.language = locale;
    document.title = locale === 'en' ? 'Homewise · Ningbo Income Tax & Mortgage Calculator' : 'Homewise · 宁波住房贷款与个人所得税联合计算器';
    document.querySelector('meta[name="description"]')?.setAttribute('content', locale === 'en'
      ? 'Compare income, Chinese tax, provident funds and mortgage plans in one transparent cash-flow workspace.'
      : '宁波工资收入、个人所得税、公积金与住房贷款联合测算，支持方案优化及比较。');
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n requires I18nProvider');
  return value;
}

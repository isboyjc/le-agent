import deepmerge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { safe } from 'ts-safe'
import { getLocaleAction } from './get-locale'

let defaultMessages: any = undefined

export default getRequestConfig(async () => {
  const locale = await getLocaleAction()

  if (!defaultMessages) {
    defaultMessages = (await import(`../messages/zh.json`)).default
  }

  const messages = await safe(() => import(`../messages/${locale}.json`))
    .map(m => m.default)
    .orElse(defaultMessages)

  return {
    locale,
    messages:
      locale === 'en' ? defaultMessages : deepmerge(defaultMessages, messages),
    getMessageFallback({ key, namespace }) {
      return `${namespace}.${key}`
    }
  }
})

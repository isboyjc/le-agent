import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 class
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 将任意类型转换为 any
 */
export function toAny<T>(value: T): any {
  return value
}

/**
 * 判断是否为 JSON
 */
export const isJson = (value: any): value is Record<string, any> => {
  try {
    if (typeof value === 'string') {
      const str = value.trim()
      JSON.parse(str)
      return true
    } else if (isObject(value)) {
      return true
    }
    return false
  } catch (_e) {
    return false
  }
}

/**
 * 将字符串的首字母大写
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 将错误转换为字符串
 */
export function errorToString(error: unknown) {
  if (error == null) {
    return 'unknown error'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error)
}

/**
 * 安全解析 JSON
 */
export function safeJSONParse<T = unknown>(
  json: string
):
  | {
      success: true
      value: T
      error?: unknown
    }
  | {
      success: false
      error: unknown
      value?: T
    } {
  try {
    const parsed = JSON.parse(json)
    return {
      success: true,
      value: parsed
    }
  } catch (e) {
    return {
      success: false,
      error: e
    }
  }
}

/**
 * 创建防抖函数
 */
export const createDebounce = () => {
  let timeout: ReturnType<typeof setTimeout>

  const debounce = (func: (...args: any[]) => any, waitFor = 200) => {
    clearTimeout(timeout!)
    timeout = setTimeout(() => func(), waitFor)
    return timeout
  }

  debounce.clear = () => {
    clearTimeout(timeout!)
  }
  return debounce
}

/**
 * 对象流
 */
export function objectFlow<T extends Record<string, any>>(obj: T) {
  return {
    map: <R>(
      fn: (value: T[keyof T], key: keyof T) => R
    ): Record<keyof T, R> => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, fn(value, key)])
      ) as Record<keyof T, R>
    },
    filter: (
      fn: (value: T[keyof T], key: keyof T) => boolean
    ): Record<keyof T, T[keyof T]> => {
      return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => fn(value, key))
      ) as Record<keyof T, T[keyof T]>
    },

    forEach: (fn: (value: T[keyof T], key: keyof T) => void): void => {
      Object.entries(obj).forEach(([key, value]) => fn(value, key))
    },
    some: (fn: (value: T[keyof T], key: keyof T) => any): boolean => {
      return Object.entries(obj).some(([key, value]) => fn(value, key))
    },
    every: (fn: (value: T[keyof T], key: keyof T) => any): boolean => {
      return Object.entries(obj).every(([key, value]) => fn(value, key))
    },
    find(fn: (value: T[keyof T], key: keyof T) => any): T | undefined {
      return Object.entries(obj).find(([key, value]) => fn(value, key))?.[1]
    },
    getByPath<U>(path: string[]): U | undefined {
      let result: any = obj
      path.find(p => {
        result = result?.[p]
        return !result
      })
      return result
    },
    setByPath(path: string[], value: any) {
      path.reduce(
        (acc, cur, i) => {
          const isLast = i == path.length - 1
          if (isLast) {
            acc[cur] = value
            return acc
          }
          acc[cur] ??= {}
          return acc[cur]
        },
        obj as Record<string, any>
      )
      return obj
    }
  }
}

/**
 * 请求数据
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')

    Object.assign(error, {
      info: await res.json(),
      status: res.status
    })

    throw error
  }

  return res.json()
}

/**
 * 截取字符串
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * 判断是否为 null 或 undefined
 */
export const isNull = (value: any): value is null | undefined => value == null

/**
 * 锁
 */
export class Locker {
  private promise = Promise.resolve()
  private resolve?: () => void

  get isLocked() {
    return this.resolve != null
  }

  lock() {
    this.promise = new Promise(resolve => {
      this.resolve = resolve
    })
  }
  unlock() {
    if (!this.isLocked) return
    this.resolve?.()
    this.resolve = undefined
  }
  async wait() {
    await this.promise
  }
}

/**
 * 判断是否为对象
 */
export const isObject = (value: any): value is Record<string, any> =>
  Object(value) === value

/**
 * 判断是否为字符串
 */
export const isString = (value: any): value is string =>
  typeof value === 'string'

/**
 * 判断是否为函数
 */
export const isFunction = <
  T extends (...args: any[]) => any = (...args: any[]) => any
>(
  v: unknown
): v is T => typeof v === 'function'

/**
 * 等待
 */
export const wait = (delay = 0) =>
  new Promise<void>(resolve => setTimeout(resolve, delay))

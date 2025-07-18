import JsonView from '@/components/ui/json-view'
import { isJson, isString, toAny } from '@/lib/utils'
import Link from 'next/link'
import { memo, PropsWithChildren } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PreBlock } from './pre-block'

const FadeIn = memo(({ children }: PropsWithChildren) => {
  return <span className="animate-in duration-1000 fade-in">{children} </span>
})
FadeIn.displayName = 'FadeIn'

const WordByWordFadeIn = memo(({ children }: PropsWithChildren) => {
  const childrens = [children]
    .flat()
    .flatMap(child => (isString(child) ? child.split(' ') : child))
  return childrens.map((word, index) =>
    isString(word) ? <FadeIn key={index}>{word}</FadeIn> : word
  )
})
WordByWordFadeIn.displayName = 'WordByWordFadeIn'
const components: Partial<Components> = {
  code: ({ children }) => {
    return (
      <code className="mx-0.5 rounded-md bg-accent px-2 py-1 text-sm">
        {children}
      </code>
    )
  },
  blockquote: ({ children }) => {
    return (
      <div className="px-4">
        <blockquote className="relative my-6 overflow-hidden rounded-2xl border bg-accent/30 p-6">
          <WordByWordFadeIn>{children}</WordByWordFadeIn>
        </blockquote>
      </div>
    )
  },
  p: ({ children }) => {
    return (
      <p className="my-4 leading-6 break-words">
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </p>
    )
  },
  pre: ({ children }) => {
    return (
      <div className="px-4 py-2">
        <PreBlock>{children}</PreBlock>
      </div>
    )
  },
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-outside list-decimal px-8" {...props}>
        {children}
      </ol>
    )
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-2 break-words" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </li>
    )
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-outside list-decimal px-8" {...props}>
        {children}
      </ul>
    )
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </span>
    )
  },
  a: ({ node, children, ...props }) => {
    return (
      <Link
        className="text-blue-400 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...toAny(props)}
      >
        <b>
          <WordByWordFadeIn>{children}</WordByWordFadeIn>
        </b>
      </Link>
    )
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="mt-6 mb-2 text-3xl font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h1>
    )
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="mt-6 mb-2 text-2xl font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h2>
    )
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="mt-6 mb-2 text-xl font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h3>
    )
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="mt-6 mb-2 text-lg font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h4>
    )
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="mt-6 mb-2 text-base font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h5>
    )
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="mt-6 mb-2 text-sm font-semibold" {...props}>
        <WordByWordFadeIn>{children}</WordByWordFadeIn>
      </h6>
    )
  },
  img: ({ node, children, ...props }) => {
    const { src, alt, ...rest } = props

    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="mx-auto rounded-lg" src={src} alt={alt} {...rest} />
    ) : null
  }
}

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <article className="relative h-full w-full">
      {isJson(children) ? (
        <JsonView data={children} />
      ) : (
        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
          {children}
        </ReactMarkdown>
      )}
    </article>
  )
}

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
)

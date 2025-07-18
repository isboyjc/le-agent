'use client'

import { cn } from '@/lib/utils'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

function CountAnimation({
  number,
  className
}: {
  number: number
  className?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)

  useEffect(() => {
    const animation = animate(count, number, { duration: 1 })

    return animation.stop
  }, [number])

  return <motion.span className={cn(className)}>{rounded}</motion.span>
}

export { CountAnimation }

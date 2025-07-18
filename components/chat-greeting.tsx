'use client'

import { FlipWords } from '@/components/ui/flip-words'
import { SYSTEM_NAME } from '@/lib/const'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

function getGreetingByTime() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 9) return 'Chat.Greeting.goodEarlyMorning'
  if (hour >= 9 && hour < 12) return 'Chat.Greeting.goodForenoon'
  if (hour >= 12 && hour < 14) return 'Chat.Greeting.goodNoon'
  if (hour >= 14 && hour < 18) return 'Chat.Greeting.goodAfternoon'
  if (hour >= 18 && hour < 24) return 'Chat.Greeting.goodEvening'
  return 'Chat.Greeting.goodNight'
}

type ChatGreetingProps = {
  onAppend?: (message: { role: 'user'; content: string }) => void
}

export function ChatGreeting({ onAppend }: ChatGreetingProps) {
  const name = SYSTEM_NAME
  const t = useTranslations()
  const word = useMemo(() => {
    if (!name) return ''
    const words = [
      t(getGreetingByTime(), { name: name }),
      t('Chat.Greeting.letMeKnowWhenYoureReadyToBegin', { name: name }),
      t('Chat.Greeting.whereWouldYouLikeToStart', { name: name })
    ]
    return words[Math.floor(Math.random() * words.length)]
  }, [name])

  const presetItems = [
    t('Chat.Greeting.presets.introduce'),
    t('Chat.Greeting.presets.introduceEnglish'),
    t('Chat.Greeting.presets.oralExpression'),
    t('Chat.Greeting.presets.workplaceEnglish'),
    t('Chat.Greeting.presets.basicDialogue'),
    t('Chat.Greeting.presets.translate'),
    t('Chat.Greeting.presets.englishText'),
    t('Chat.Greeting.presets.japaneseText'),
    t('Chat.Greeting.presets.koreanText'),
    t('Chat.Greeting.presets.germanText'),
    t('Chat.Greeting.presets.russianText'),
    t('Chat.Greeting.presets.frenchText')
  ]

  return (
    <div className="flex flex-col items-center">
      <motion.div
        key="welcome"
        className="mx-auto my-3 h-20 max-w-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col gap-2 rounded-xl p-6 text-center leading-relaxed">
          <h1 className="text-2xl md:text-3xl">
            {word ? <FlipWords words={[word]} className="text-primary" /> : ''}
          </h1>
        </div>
      </motion.div>

      {onAppend && (
        <motion.div
          className="mx-auto mb-15 max-w-4xl px-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {presetItems.map((prompt, index) => (
              <motion.button
                key={index}
                onClick={() => onAppend({ role: 'user', content: prompt })}
                className="group rounded-lg border border-border bg-background px-3 py-2 text-sm transition-all hover:border-primary/50 hover:bg-accent hover:shadow-md"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.5 + index * 0.05,
                  duration: 0.2,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
              >
                <span className="text-foreground transition-colors group-hover:text-primary">
                  {prompt}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

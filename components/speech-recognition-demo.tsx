'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useState } from 'react'

export default function SpeechRecognitionDemo() {
  const {
    isSupported,
    isListening,
    isLoading,
    transcript,
    interimTranscript,
    finalTranscript,
    results,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    setOptions,
    error
  } = useSpeechRecognition()

  const [selectedLang, setSelectedLang] = useState('zh-CN')
  const [continuous, setContinuous] = useState(true)
  const [interimResults, setInterimResults] = useState(true)

  const languages = [
    { code: 'zh-CN', name: '中文 (简体)' },
    { code: 'zh-TW', name: '中文 (繁体)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'es-ES', name: 'Español' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'ru-RU', name: 'Русский' }
  ]

  const handleStartListening = () => {
    setOptions({
      continuous,
      interimResults,
      lang: selectedLang,
      maxAlternatives: 3
    })
    startListening()
  }

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { level: '高', color: 'bg-green-500' }
    if (confidence >= 0.6) return { level: '中', color: 'bg-yellow-500' }
    return { level: '低', color: 'bg-red-500' }
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">您的浏览器不支持语音识别功能</p>
        <p className="mt-2 text-sm text-red-600">
          请使用 Chrome、Edge 或其他基于 Chromium 的浏览器
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">语音识别演示</h2>
        <p className="text-gray-600">基于 Web Speech API 的语音识别功能</p>
      </div>

      {/* 配置区域 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-lg font-semibold">识别配置</h3>

        {/* 语言选择 */}
        <div className="space-y-2">
          <Label htmlFor="language">识别语言</Label>
          <select
            id="language"
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={isListening}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* 选项设置 */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={continuous}
              onChange={e => setContinuous(e.target.checked)}
              disabled={isListening}
            />
            <span className="text-sm">连续识别</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={interimResults}
              onChange={e => setInterimResults(e.target.checked)}
              disabled={isListening}
            />
            <span className="text-sm">显示临时结果</span>
          </label>
        </div>
      </div>

      {/* 控制区域 */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleStartListening}
          disabled={isListening || isLoading}
          variant={isListening ? 'secondary' : 'default'}
          className="flex items-center gap-2"
        >
          {isLoading
            ? '初始化中...'
            : isListening
              ? '🎤 正在监听...'
              : '🎤 开始识别'}
        </Button>

        <Button
          onClick={stopListening}
          disabled={!isListening}
          variant="outline"
        >
          停止识别
        </Button>

        <Button
          onClick={abortListening}
          disabled={!isListening}
          variant="destructive"
        >
          中断识别
        </Button>

        <Button onClick={resetTranscript} variant="outline">
          清除结果
        </Button>
      </div>

      {/* 状态指示 */}
      <div className="flex gap-4 text-sm">
        <span className={isListening ? 'text-green-600' : 'text-gray-400'}>
          ● 监听中: {isListening ? '是' : '否'}
        </span>
        <span className={isLoading ? 'text-blue-600' : 'text-gray-400'}>
          ● 加载中: {isLoading ? '是' : '否'}
        </span>
        <span className={error ? 'text-red-600' : 'text-gray-400'}>
          ● 错误: {error ? '是' : '否'}
        </span>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 识别结果显示 */}
      <div className="space-y-4">
        {/* 实时结果 */}
        {(transcript || interimTranscript) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-900">实时识别结果</h3>
            <div className="space-y-2">
              {finalTranscript && (
                <div>
                  <span className="text-sm text-blue-600">最终结果:</span>
                  <p className="font-medium text-blue-900">{finalTranscript}</p>
                </div>
              )}
              {interimTranscript && (
                <div>
                  <span className="text-sm text-blue-600">临时结果:</span>
                  <p className="text-blue-700 italic">{interimTranscript}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 完整识别历史 */}
        {results.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 font-semibold">识别历史记录</h3>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {results.map((result, index) => {
                const { level, color } = getConfidenceLevel(result.confidence)
                return (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={result.isFinal ? 'default' : 'secondary'}
                        >
                          {result.isFinal ? '最终' : '临时'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${color}`}
                          ></div>
                          <span className="text-sm text-gray-600">
                            置信度: {level} (
                            {(result.confidence * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        #{index + 1}
                      </span>
                    </div>

                    <p className="mb-2 text-gray-900">{result.transcript}</p>

                    {result.alternatives.length > 1 && (
                      <div className="text-sm">
                        <span className="text-gray-600">其他候选:</span>
                        <ul className="mt-1 space-y-1">
                          {result.alternatives.slice(1).map((alt, altIndex) => (
                            <li key={altIndex} className="pl-2 text-gray-500">
                              • {alt.transcript}
                              <span className="ml-1 text-xs">
                                ({(alt.confidence * 100).toFixed(1)}%)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <h4 className="mb-2 font-semibold">使用提示:</h4>
        <ul className="list-inside list-disc space-y-1">
          <li>首次使用需要授权麦克风权限</li>
          <li>连续识别模式会持续监听直到手动停止</li>
          <li>临时结果会实时显示，最终结果会在语音停顿后确认</li>
          <li>不同语言的识别效果可能有差异</li>
          <li>在安静的环境中使用效果更佳</li>
        </ul>
      </div>
    </div>
  )
}

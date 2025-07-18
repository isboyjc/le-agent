'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import { useState } from 'react'

export default function SpeechSynthesisDemo() {
  const {
    isSupported,
    isPlaying,
    isPaused,
    isLoading,
    voices,
    speak,
    pause,
    resume,
    stop,
    setDefaultOptions,
    currentText,
    currentOptions
  } = useSpeechSynthesis()

  const [text, setText] = useState('你好，这是一个语音合成测试。')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)

  const handleSpeak = async () => {
    try {
      const voice = voices.find(v => v.voiceURI === selectedVoice)
      await speak(text, {
        voice,
        rate,
        pitch,
        volume
      })
    } catch (error) {
      console.error('语音合成错误:', error)
    }
  }

  const handleSetDefaults = () => {
    const voice = voices.find(v => v.voiceURI === selectedVoice)
    setDefaultOptions({
      voice,
      rate,
      pitch,
      volume
    })
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">您的浏览器不支持语音合成功能</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">语音合成演示</h2>
        <p className="text-gray-600">基于 Web Speech API 的语音合成功能</p>
      </div>

      {/* 文本输入 */}
      <div className="space-y-2">
        <Label htmlFor="text">要朗读的文本</Label>
        <Input
          id="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="输入要朗读的文本..."
        />
      </div>

      {/* 语音选择 */}
      <div className="space-y-2">
        <Label htmlFor="voice">选择语音</Label>
        <select
          id="voice"
          value={selectedVoice}
          onChange={e => setSelectedVoice(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">选择语音</option>
          {voices.map(voice => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      {/* 语速控制 */}
      <div className="space-y-2">
        <Label htmlFor="rate">语速: {rate}</Label>
        <input
          id="rate"
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={rate}
          onChange={e => setRate(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 音调控制 */}
      <div className="space-y-2">
        <Label htmlFor="pitch">音调: {pitch}</Label>
        <input
          id="pitch"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={pitch}
          onChange={e => setPitch(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 音量控制 */}
      <div className="space-y-2">
        <Label htmlFor="volume">音量: {volume}</Label>
        <input
          id="volume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 控制按钮 */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleSpeak}
          disabled={isLoading || !text.trim()}
          variant={isPlaying ? 'secondary' : 'default'}
        >
          {isLoading ? '加载中...' : isPlaying ? '播放中...' : '开始朗读'}
        </Button>

        <Button
          onClick={pause}
          disabled={!isPlaying || isPaused}
          variant="outline"
        >
          暂停
        </Button>

        <Button onClick={resume} disabled={!isPaused} variant="outline">
          继续
        </Button>

        <Button
          onClick={stop}
          disabled={!isPlaying && !isPaused}
          variant="destructive"
        >
          停止
        </Button>

        <Button onClick={handleSetDefaults} variant="outline">
          设为默认
        </Button>
      </div>

      {/* 状态显示 */}
      {currentText && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            <strong>当前播放:</strong> {currentText}
          </p>
          <p className="mt-1 text-sm text-blue-600">
            语速: {currentOptions.rate}, 音调: {currentOptions.pitch}, 音量:{' '}
            {currentOptions.volume}
          </p>
        </div>
      )}

      {/* 状态指示 */}
      <div className="flex gap-4 text-sm">
        <span className={isPlaying ? 'text-green-600' : 'text-gray-400'}>
          ● 播放中: {isPlaying ? '是' : '否'}
        </span>
        <span className={isPaused ? 'text-yellow-600' : 'text-gray-400'}>
          ● 暂停: {isPaused ? '是' : '否'}
        </span>
        <span className={isLoading ? 'text-blue-600' : 'text-gray-400'}>
          ● 加载中: {isLoading ? '是' : '否'}
        </span>
      </div>
    </div>
  )
}

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import { useMemo, useState } from 'react'

export default function SpeechComboDemo() {
  const {
    isSupported: isSynthSupported,
    isPlaying,
    speak,
    stop: stopSpeaking,
    voices
  } = useSpeechSynthesis()

  const {
    isSupported: isRecognitionSupported,
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript,
    setOptions,
    error
  } = useSpeechRecognition()

  const [inputText, setInputText] = useState('你好，这是一个语音合成测试。')
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [selectedLang, setSelectedLang] = useState('zh-CN')
  const [showLanguageDetails, setShowLanguageDetails] = useState(false)

  // 从语音合成中获取支持的语言
  const supportedSynthLanguages = useMemo(() => {
    const langMap = new Map<
      string,
      { code: string; name: string; voices: typeof voices }
    >()

    voices.forEach(voice => {
      if (!langMap.has(voice.lang)) {
        langMap.set(voice.lang, {
          code: voice.lang,
          name: getLanguageName(voice.lang),
          voices: []
        })
      }
      langMap.get(voice.lang)!.voices.push(voice)
    })

    return Array.from(langMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [voices])

  // 常见的语音识别支持语言（这些是Web Speech API可能支持的语言）
  const potentialRecognitionLanguages = [
    { code: 'af', name: 'Afrikaans' },
    { code: 'ar', name: 'العربية' },
    { code: 'az', name: 'Azərbaycan' },
    { code: 'be', name: 'Беларуская' },
    { code: 'bg', name: 'български' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'bs', name: 'Bosanski' },
    { code: 'ca', name: 'Català' },
    { code: 'cs', name: 'Čeština' },
    { code: 'da', name: 'Dansk' },
    { code: 'de', name: 'Deutsch' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'et', name: 'Eesti' },
    { code: 'eu', name: 'Euskera' },
    { code: 'fa', name: 'فارسی' },
    { code: 'fi', name: 'Suomi' },
    { code: 'fr', name: 'Français' },
    { code: 'gl', name: 'Galego' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'he', name: 'עברית' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'hu', name: 'Magyar' },
    { code: 'hy', name: 'Հայերեն' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'is', name: 'Íslenska' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
    { code: 'ka', name: 'ქართული' },
    { code: 'kk', name: 'Қазақ' },
    { code: 'km', name: 'ភាសាខ្មែរ' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'ko', name: '한국어' },
    { code: 'lo', name: 'ລາວ' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'mk', name: 'Македонски' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'mn', name: 'Монгол' },
    { code: 'mr', name: 'मराठी' },
    { code: 'ms', name: 'Bahasa Melayu' },
    { code: 'my', name: 'ဗမာ' },
    { code: 'ne', name: 'नेपाली' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'no', name: 'Norsk' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'pl', name: 'Polski' },
    { code: 'pt', name: 'Português' },
    { code: 'ro', name: 'Română' },
    { code: 'ru', name: 'Русский' },
    { code: 'si', name: 'සිංහල' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'sq', name: 'Shqip' },
    { code: 'sr', name: 'Српски' },
    { code: 'sv', name: 'Svenska' },
    { code: 'sw', name: 'Kiswahili' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'th', name: 'ไทย' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'uk', name: 'Українська' },
    { code: 'ur', name: 'اردو' },
    { code: 'uz', name: 'Oʻzbek' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'zh', name: '中文' },
    { code: 'zu', name: 'isiZulu' }
  ]

  // 获取语言名称
  function getLanguageName(langCode: string): string {
    const langMap: Record<string, string> = {
      'zh-CN': '中文 (简体)',
      'zh-TW': '中文 (繁体)',
      'zh-HK': '中文 (香港)',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'en-AU': 'English (Australia)',
      'en-CA': 'English (Canada)',
      'en-IN': 'English (India)',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
      'fr-FR': 'Français',
      'fr-CA': 'Français (Canada)',
      'de-DE': 'Deutsch',
      'es-ES': 'Español',
      'es-MX': 'Español (México)',
      'es-AR': 'Español (Argentina)',
      'pt-BR': 'Português (Brasil)',
      'pt-PT': 'Português (Portugal)',
      'it-IT': 'Italiano',
      'ru-RU': 'Русский',
      'ar-SA': 'العربية',
      'hi-IN': 'हिन्दी',
      'th-TH': 'ไทย',
      'vi-VN': 'Tiếng Việt',
      'nl-NL': 'Nederlands',
      'sv-SE': 'Svenska',
      'da-DK': 'Dansk',
      'no-NO': 'Norsk',
      'fi-FI': 'Suomi',
      'pl-PL': 'Polski',
      'cs-CZ': 'Čeština',
      'sk-SK': 'Slovenčina',
      'hu-HU': 'Magyar',
      'ro-RO': 'Română',
      'bg-BG': 'Български',
      'hr-HR': 'Hrvatski',
      'el-GR': 'Ελληνικά',
      'tr-TR': 'Türkçe',
      'he-IL': 'עברית',
      'fa-IR': 'فارسی',
      'ur-PK': 'اردو',
      'bn-BD': 'বাংলা',
      'ta-IN': 'தமிழ்',
      'te-IN': 'తెలుగు',
      'ml-IN': 'മലയാളം',
      'kn-IN': 'ಕನ್ನಡ',
      'gu-IN': 'ગુજરાતી',
      'mr-IN': 'मराठी',
      'pa-IN': 'ਪੰਜਾਬੀ',
      'ne-NP': 'नेपाली',
      'si-LK': 'සිංහල',
      'my-MM': 'ဗမာ',
      'km-KH': 'ភាសាខ្មែរ',
      'lo-LA': 'ລາວ',
      'ka-GE': 'ქართული',
      'hy-AM': 'Հայերեն',
      'az-AZ': 'Azərbaycan',
      'kk-KZ': 'Қазақ',
      'ky-KG': 'Кыргыз',
      'uz-UZ': 'Oʻzbek',
      'mn-MN': 'Монгол',
      'is-IS': 'Íslenska',
      'mt-MT': 'Malti',
      'cy-GB': 'Cymraeg',
      'ga-IE': 'Gaeilge',
      'eu-ES': 'Euskera',
      'ca-ES': 'Català',
      'gl-ES': 'Galego',
      'af-ZA': 'Afrikaans',
      'sw-KE': 'Kiswahili',
      'zu-ZA': 'isiZulu',
      'am-ET': 'አማርኛ',
      'id-ID': 'Bahasa Indonesia',
      'ms-MY': 'Bahasa Melayu',
      'tl-PH': 'Filipino'
    }

    return langMap[langCode] || langCode
  }

  // 获取常用的语言选项
  const commonLanguages = [
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
    { code: 'ru-RU', name: 'Русский' },
    { code: 'ar-SA', name: 'العربية' },
    { code: 'hi-IN', name: 'हिन्दी' },
    { code: 'th-TH', name: 'ไทย' },
    { code: 'vi-VN', name: 'Tiếng Việt' }
  ]

  const handleSpeak = async (text: string) => {
    if (!text.trim()) return

    try {
      const voice = voices.find(v => v.voiceURI === selectedVoice)
      await speak(text, {
        voice,
        rate: 1,
        pitch: 1,
        volume: 1,
        lang: selectedLang
      })
    } catch (err) {
      console.error('语音合成错误:', err)
    }
  }

  const handleStartListening = () => {
    setOptions({
      continuous: false,
      interimResults: true,
      lang: selectedLang,
      maxAlternatives: 1
    })
    startListening()
  }

  const handleSpeakRecognizedText = () => {
    if (finalTranscript) {
      handleSpeak(finalTranscript)
    }
  }

  const handleCopyToInput = () => {
    if (finalTranscript) {
      setInputText(finalTranscript)
    }
  }

  const isSupported = isSynthSupported && isRecognitionSupported

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">您的浏览器不完全支持语音功能</p>
        <div className="mt-2 space-y-1 text-sm text-red-600">
          <p>• 语音合成: {isSynthSupported ? '✅ 支持' : '❌ 不支持'}</p>
          <p>• 语音识别: {isRecognitionSupported ? '✅ 支持' : '❌ 不支持'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">语音综合演示</h2>
        <p className="text-gray-600">
          语音合成 + 语音识别 = 完整的语音交互体验
        </p>
      </div>

      {/* 语言支持详情 */}
      <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-900">
            🌐 浏览器语言支持详情
          </h3>
          <Button
            onClick={() => setShowLanguageDetails(!showLanguageDetails)}
            variant="outline"
            size="sm"
          >
            {showLanguageDetails ? '隐藏详情' : '显示详情'}
          </Button>
        </div>

        {showLanguageDetails && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 语音合成支持的语言 */}
            <div>
              <h4 className="mb-3 font-semibold text-blue-900">
                🔊 语音合成支持的语言 ({supportedSynthLanguages.length} 种)
              </h4>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-blue-200 bg-white p-3">
                <div className="space-y-2">
                  {supportedSynthLanguages.map(lang => (
                    <div
                      key={lang.code}
                      className="border-b border-blue-100 pb-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">
                          {lang.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {lang.code}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-blue-600">
                        {lang.voices.length} 个语音可用
                      </div>
                      <div className="mt-1 text-xs text-blue-500">
                        {lang.voices
                          .slice(0, 3)
                          .map(v => v.name)
                          .join(', ')}
                        {lang.voices.length > 3 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 语音识别可能支持的语言 */}
            <div>
              <h4 className="mb-3 font-semibold text-blue-900">
                🎤 语音识别可能支持的语言 (
                {potentialRecognitionLanguages.length} 种)
              </h4>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-blue-200 bg-white p-3">
                <div className="mb-2 text-xs text-blue-600">
                  * 实际支持情况因浏览器而异，建议测试验证
                </div>
                <div className="space-y-1">
                  {potentialRecognitionLanguages.map(lang => (
                    <div
                      key={lang.code}
                      className="flex items-center justify-between border-b border-blue-100 pb-1"
                    >
                      <span className="text-sm text-blue-900">{lang.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {lang.code}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 配置区域 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-lg font-semibold">基本配置</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 语言选择 */}
          <div className="space-y-2">
            <Label htmlFor="language">语言</Label>
            <select
              id="language"
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {commonLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* 语音选择 */}
          <div className="space-y-2">
            <Label htmlFor="voice">语音</Label>
            <select
              id="voice"
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">默认语音</option>
              {voices
                .filter(voice =>
                  voice.lang.startsWith(selectedLang.split('-')[0])
                )
                .map(voice => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* 语音合成区域 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          🔊 语音合成
          <Badge variant={isPlaying ? 'default' : 'secondary'}>
            {isPlaying ? '播放中' : '待机'}
          </Badge>
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="text">要朗读的文本</Label>
            <Input
              id="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="输入要朗读的文本..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleSpeak(inputText)}
              disabled={!inputText.trim() || isPlaying}
            >
              {isPlaying ? '播放中...' : '开始朗读'}
            </Button>

            <Button
              onClick={stopSpeaking}
              disabled={!isPlaying}
              variant="destructive"
            >
              停止朗读
            </Button>
          </div>
        </div>
      </div>

      {/* 语音识别区域 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          🎤 语音识别
          <Badge variant={isListening ? 'default' : 'secondary'}>
            {isListening ? '监听中' : '待机'}
          </Badge>
        </h3>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleStartListening}
            disabled={isListening}
            className="flex items-center gap-2"
          >
            {isListening ? '🎤 监听中...' : '🎤 开始识别'}
          </Button>

          <Button
            onClick={stopListening}
            disabled={!isListening}
            variant="outline"
          >
            停止识别
          </Button>

          <Button onClick={resetTranscript} variant="outline">
            清除结果
          </Button>
        </div>

        {/* 识别结果 */}
        {(transcript || interimTranscript) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold text-blue-900">识别结果</h4>
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

            {/* 识别结果操作按钮 */}
            {finalTranscript && (
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleSpeakRecognizedText}
                  size="sm"
                  variant="outline"
                >
                  朗读识别结果
                </Button>
                <Button onClick={handleCopyToInput} size="sm" variant="outline">
                  复制到输入框
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* 智能交互区域 */}
      <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h3 className="text-lg font-semibold text-purple-900">🤖 智能交互</h3>

        <div className="space-y-3">
          <p className="text-sm text-purple-700">试试这些智能交互功能：</p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleSpeak('请说话，我会重复你说的内容')}
              size="sm"
              variant="outline"
              className="border-purple-300 hover:bg-purple-100"
            >
              语音提示
            </Button>

            <Button
              onClick={() => {
                handleSpeak('现在开始语音识别')
                setTimeout(() => {
                  handleStartListening()
                }, 2000)
              }}
              size="sm"
              variant="outline"
              className="border-purple-300 hover:bg-purple-100"
            >
              语音+识别连环
            </Button>
          </div>
        </div>
      </div>

      {/* 状态监控 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 font-semibold">状态监控</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <span className="font-medium">语音合成:</span>
            <div className="mt-1 space-y-1">
              <span className={isPlaying ? 'text-green-600' : 'text-gray-400'}>
                ● 播放中: {isPlaying ? '是' : '否'}
              </span>
              <span className="text-blue-600">
                ● 可用语音: {voices.length} 个
              </span>
              <span className="text-blue-600">
                ● 支持语言: {supportedSynthLanguages.length} 种
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium">语音识别:</span>
            <div className="mt-1 space-y-1">
              <span
                className={isListening ? 'text-green-600' : 'text-gray-400'}
              >
                ● 监听中: {isListening ? '是' : '否'}
              </span>
              <span className={error ? 'text-red-600' : 'text-gray-400'}>
                ● 错误: {error ? '是' : '否'}
              </span>
              <span className="text-blue-600">
                ● 潜在支持: {potentialRecognitionLanguages.length} 种语言
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium">当前配置:</span>
            <div className="mt-1 space-y-1">
              <span className="text-blue-600">
                ● 语言: {getLanguageName(selectedLang)}
              </span>
              <span className="text-blue-600">
                ● 语音:{' '}
                {selectedVoice
                  ? voices.find(v => v.voiceURI === selectedVoice)?.name ||
                    '默认'
                  : '默认'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 使用指南 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <h4 className="mb-2 font-semibold">使用指南:</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <h5 className="mb-1 font-medium text-gray-800">语音合成:</h5>
            <ul className="list-inside list-disc space-y-1">
              <li>在输入框中输入文本</li>
              <li>选择合适的语言和语音</li>
              <li>点击"开始朗读"播放</li>
              <li>查看"显示详情"了解所有支持的语言</li>
            </ul>
          </div>
          <div>
            <h5 className="mb-1 font-medium text-gray-800">语音识别:</h5>
            <ul className="list-inside list-disc space-y-1">
              <li>点击"开始识别"并授权麦克风</li>
              <li>清楚地说出要识别的内容</li>
              <li>可以将识别结果复制到输入框</li>
              <li>不同浏览器支持的语言可能不同</li>
            </ul>
          </div>
          <div>
            <h5 className="mb-1 font-medium text-gray-800">语言支持:</h5>
            <ul className="list-inside list-disc space-y-1">
              <li>语音合成：基于浏览器实际可用语音</li>
              <li>语音识别：基于Web Speech API规范</li>
              <li>建议测试验证具体语言支持情况</li>
              <li>Chrome浏览器通常支持最多语言</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

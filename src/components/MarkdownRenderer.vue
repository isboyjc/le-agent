<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import markdownItHighlightjs from 'markdown-it-highlightjs';

interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
}

const props = defineProps<MarkdownRendererProps>();

// 注册常用语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);
hljs.registerLanguage('xml', html);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);

// 配置markdown-it实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
}).use(markdownItHighlightjs, {
  hljs,
  auto: true,
  code: true,
  inline: false
});

// 渲染HTML
const renderedContent = computed(() => {
  if (!props.content) return '';

  // 如果是用户消息，直接返回原始内容（不渲染markdown）
  if (props.isUserMessage) {
    return props.content;
  }

  try {
    return md.render(props.content);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return props.content;
  }
});
</script>

<template>
  <div class="markdown-content">
    <!-- 用户消息：纯文本显示 -->
    <div v-if="isUserMessage" class="whitespace-pre-wrap">{{ content }}</div>

    <!-- 助手消息：markdown渲染 -->
    <div v-else v-html="renderedContent" class="prose prose-sm max-w-none break-words markdown-body"></div>
  </div>
</template>

<style scoped>
.markdown-content {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
  contain: layout;
  min-width: 0;
}

/* Markdown 样式 */
:deep(.markdown-body) {
  color: inherit;
  font-size: 0.875rem;
  line-height: 1.6;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

:deep(.markdown-body *) {
  max-width: 100%;
  box-sizing: border-box;
}

/* 标题样式 */
:deep(.markdown-body h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem 0;
  border-bottom: 2px solid var(--le-border);
  padding-bottom: 0.75rem;
  color: var(--le-text-primary);
}

:deep(.markdown-body h2) {
  font-size: 1.5rem;
  font-weight: 650;
  margin: 1.25rem 0 0.5rem 0;
  color: var(--le-text-primary);
}

:deep(.markdown-body h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
  color: var(--le-text-primary);
}

:deep(.markdown-body h4, .markdown-body h5, .markdown-body h6) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.75rem 0 0.25rem 0;
  color: var(--le-text-primary);
}

/* 段落样式 */
:deep(.markdown-body p) {
  margin: 0.75rem 0;
  line-height: 1.7;
  color: var(--le-text-primary);
}

:deep(.markdown-body p:first-child) {
  margin-top: 0;
}

:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

/* 列表样式 */
:deep(.markdown-body ul, .markdown-body ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

:deep(.markdown-body li) {
  margin: 0.5rem 0;
  line-height: 1.6;
}

:deep(.markdown-body ul ul, .markdown-body ol ol) {
  margin: 0.25rem 0;
}

/* 引用样式 */
:deep(.markdown-body blockquote) {
  border-left: 4px solid var(--le-primary);
  margin: 1.5rem 0;
  padding: 0.75rem 0 0.75rem 1.25rem;
  background: var(--le-background-soft);
  border-radius: 0 8px 8px 0;
  position: relative;
}

:deep(.markdown-body blockquote p) {
  margin: 0;
  color: var(--le-text-secondary);
  font-style: italic;
}

:deep(.markdown-body blockquote::before) {
  content: '"';
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  font-size: 1.5rem;
  color: var(--le-primary);
  opacity: 0.5;
}

/* 内联代码样式 */
:deep(.markdown-body code) {
  background: var(--le-background-soft);
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  color: var(--le-text-primary);
  border: 1px solid var(--le-border);
}

/* 代码块样式 */
:deep(.markdown-body pre) {
  background: var(--le-background-soft);
  border: 1px solid var(--le-border);
  border-radius: 12px;
  padding: 1.25rem;
  margin: 1.5rem 0;
  overflow-x: auto;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: pre;
  max-width: 100%;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  margin-left: 0;
  margin-right: 0;
  contain: layout;
}

:deep(.markdown-body pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  color: inherit;
  border: none;
  font-size: inherit;
  white-space: pre;
  word-wrap: normal;
}

/* 表格样式 */
:deep(.markdown-body table) {
  border-collapse: collapse;
  margin: 1.5rem 0;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.markdown-body th, .markdown-body td) {
  border: 1px solid var(--le-border);
  padding: 0.75rem;
  text-align: left;
}

:deep(.markdown-body th) {
  background: var(--le-background-soft);
  font-weight: 600;
  color: var(--le-text-primary);
}

:deep(.markdown-body td) {
  background: var(--le-background);
}

:deep(.markdown-body tr:nth-child(even) td) {
  background: var(--le-background-soft);
}

/* 链接样式 */
:deep(.markdown-body a) {
  color: var(--le-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

:deep(.markdown-body a:hover) {
  color: var(--le-primary-hover);
  border-bottom-color: var(--le-primary);
}

/* 分割线样式 */
:deep(.markdown-body hr) {
  border: none;
  height: 2px;
  background: linear-gradient(to right, transparent, var(--le-border), transparent);
  margin: 2rem 0;
}

/* 强调样式 */
:deep(.markdown-body strong) {
  font-weight: 700;
  color: var(--le-text-primary);
}

:deep(.markdown-body em) {
  font-style: italic;
  color: var(--le-text-secondary);
}

/* 删除线样式 */
:deep(.markdown-body del) {
  text-decoration: line-through;
  color: var(--le-text-tertiary);
}

/* 代码高亮样式 - 重置基础样式 */
:deep(.hljs) {
  background: var(--le-background-soft) !important;
  color: var(--le-text-primary) !important;
  padding: 0 !important;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
  font-size: 0.85rem !important;
  line-height: 1.5 !important;
}

/* 明亮主题代码高亮 */
html:not(.dark) :deep(.hljs-comment),
html:not(.dark) :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

html:not(.dark) :deep(.hljs-keyword),
html:not(.dark) :deep(.hljs-selector-tag),
html:not(.dark) :deep(.hljs-literal),
html:not(.dark) :deep(.hljs-type) {
  color: #d73a49;
  font-weight: 600;
}

html:not(.dark) :deep(.hljs-string),
html:not(.dark) :deep(.hljs-regexp) {
  color: #032f62;
}

html:not(.dark) :deep(.hljs-number),
html:not(.dark) :deep(.hljs-built_in),
html:not(.dark) :deep(.hljs-builtin-name) {
  color: #005cc5;
}

html:not(.dark) :deep(.hljs-function),
html:not(.dark) :deep(.hljs-title) {
  color: #6f42c1;
  font-weight: 600;
}

html:not(.dark) :deep(.hljs-variable),
html:not(.dark) :deep(.hljs-attr) {
  color: #e36209;
}

html:not(.dark) :deep(.hljs-class),
html:not(.dark) :deep(.hljs-title.class_) {
  color: #6f42c1;
}

html:not(.dark) :deep(.hljs-tag) {
  color: #22863a;
}

html:not(.dark) :deep(.hljs-attribute) {
  color: #005cc5;
}

/* 暗黑主题代码高亮 */
html.dark :deep(.hljs-comment),
html.dark :deep(.hljs-quote) {
  color: #8b949e;
  font-style: italic;
}

html.dark :deep(.hljs-keyword),
html.dark :deep(.hljs-selector-tag),
html.dark :deep(.hljs-literal),
html.dark :deep(.hljs-type) {
  color: #ff7b72;
  font-weight: 600;
}

html.dark :deep(.hljs-string),
html.dark :deep(.hljs-regexp) {
  color: #a5d6ff;
}

html.dark :deep(.hljs-number),
html.dark :deep(.hljs-built_in),
html.dark :deep(.hljs-builtin-name) {
  color: #79c0ff;
}

html.dark :deep(.hljs-function),
html.dark :deep(.hljs-title) {
  color: #d2a8ff;
  font-weight: 600;
}

html.dark :deep(.hljs-variable),
html.dark :deep(.hljs-attr) {
  color: #ffa657;
}

html.dark :deep(.hljs-class),
html.dark :deep(.hljs-title.class_) {
  color: #d2a8ff;
}

html.dark :deep(.hljs-tag) {
  color: #7ee787;
}

html.dark :deep(.hljs-attribute) {
  color: #79c0ff;
}

/* 特殊元素样式 */
:deep(.markdown-body img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.markdown-body code[class*="language-"]) {
  background: transparent;
  padding: 0;
  border: none;
}

/* 优化移动端显示 */
@media (max-width: 768px) {
  :deep(.markdown-body) {
    font-size: 0.8rem;
  }

  :deep(.markdown-body h1) {
    font-size: 1.5rem;
  }

  :deep(.markdown-body h2) {
    font-size: 1.25rem;
  }

  :deep(.markdown-body h3) {
    font-size: 1.125rem;
  }

  :deep(.markdown-body pre) {
    padding: 1rem;
    font-size: 0.8rem;
  }

  :deep(.markdown-body table) {
    font-size: 0.75rem;
  }

  :deep(.markdown-body th, .markdown-body td) {
    padding: 0.5rem;
  }
}
</style>

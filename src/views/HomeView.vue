<script setup lang="ts">
</script>

<template>
  <main class="relative h-screen overflow-hidden bg-background text-foreground">
    <icon-le-logo class="absolute top-10 left-10 w-[20px] h-[20px] text-primary" />

    <!-- 主题切换组件 -->
    <div class="absolute top-10 right-10">
      <ThemeToggle />
    </div>

    <div class="flex items-center justify-center h-full">
      <div class="text-center space-y-6">
        <h1 class="text-4xl font-bold text-text-primary">Le Agent</h1>
        <p class="text-text-secondary">支持主题切换的现代化应用程序</p>
      </div>
    </div>

    <div
      class="bg-card absolute bottom-[80px] left-1/2 -translate-x-1/2 text-card-foreground border border-border rounded-3xl p-4 max-w-560px">
      <h3 class="font-semibold text-text-primary mb-2">主题切换功能</h3>
      <p class="text-text-secondary text-sm">
        尝试使用右上角的主题切换器来切换亮色模式、暗色模式或跟随系统设置。
      </p>
    </div>
  </main>
</template>

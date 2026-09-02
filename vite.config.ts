// Импортируем defineConfig именно из 'vitest/config', а не из 'vite':
// эта версия знает про секцию `test` внизу файла.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Vite — это инструмент, который собирает проект и запускает сервер разработки.
// Плагины: react — понимает JSX, tailwindcss — собирает наши стили.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // То же самое, что "paths" в tsconfig.json, но для сборщика.
    // TypeScript и Vite — разные программы, каждой нужно объяснить отдельно,
    // что "@/" означает папку src.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    // 0.0.0.0 — слушать все сетевые интерфейсы.
    // Обязательно для Docker: без этого сервер внутри контейнера
    // был бы доступен только самому контейнеру, но не браузеру на компьютере.
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Docker на Windows не всегда получает уведомления об изменении файлов,
      // поэтому просим Vite опрашивать файлы самому. Иначе страница
      // не будет обновляться, когда мы правим код.
      usePolling: true,
    },
  },

  // Настройки автотестов (Vitest использует этот же файл).
  test: {
    // globals: describe/it/expect доступны без импорта в каждом файле
    globals: true,
    // jsdom — «фальшивый браузер» внутри Node: даёт document, window и т.д.
    // Без него нельзя тестировать React-компоненты.
    environment: 'jsdom',
    // файл, который выполняется перед каждым тестовым файлом
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})

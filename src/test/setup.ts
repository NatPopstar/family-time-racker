// Этот файл Vitest выполняет ОДИН РАЗ перед каждым тестовым файлом.
// Здесь подключаем дополнительные проверки для тестов интерфейса,
// например expect(кнопка).toBeInTheDocument() или .toBeDisabled().
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// После каждого теста стираем нарисованные компоненты из «фальшивого браузера».
// Без этого тесты начали бы видеть остатки предыдущих и падать без причины.
afterEach(() => {
  cleanup()
})

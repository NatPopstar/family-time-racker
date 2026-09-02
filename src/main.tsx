import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Точка входа. Здесь React находит пустой <div id="root"> из index.html
// и рисует внутри него всё приложение.
//
// StrictMode — режим разработки: React намеренно вызывает компоненты дважды,
// чтобы заранее выявить ошибки. В собранной версии этого не происходит.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CounterWidget from "./App.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CounterWidget />
  </StrictMode>,
)

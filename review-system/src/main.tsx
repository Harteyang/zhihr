import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initAuthFromSharedAuth } from './stores/auth'
import { initTheme } from './stores/settings'
import { useReviewsStore } from './stores/reviews'

// 初始化
initAuthFromSharedAuth()
initTheme()
useReviewsStore.getState().loadFromLocalStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

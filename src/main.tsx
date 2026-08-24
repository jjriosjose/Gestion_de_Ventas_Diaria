import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles.css'
import './styles/v058.css'
import './styles/v062.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><App/></AuthProvider></React.StrictMode>)
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}

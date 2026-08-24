import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles.css'
import './styles/v058.css'
import './styles/v062.css'
import './styles/v063.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><App/></AuthProvider></React.StrictMode>)

const localDevelopmentHosts=new Set(['localhost','127.0.0.1','::1'])
const isLocalDevelopment=localDevelopmentHosts.has(window.location.hostname)

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    if(isLocalDevelopment){
      void navigator.serviceWorker.getRegistrations()
        .then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))
        .catch(()=>{})
      if('caches' in window){
        void caches.keys()
          .then(keys=>Promise.all(keys.filter(key=>key.startsWith('gvd-shell-')).map(key=>caches.delete(key))))
          .catch(()=>{})
      }
      return
    }
    void navigator.serviceWorker.register('/sw.js').catch(()=>{})
  })
}

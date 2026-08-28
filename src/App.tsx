import { BrowserRouter,Navigate,Route,Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { DashboardWorkspace } from './pages/DashboardWorkspace'
import { Clients } from './pages/Clients'
import { MapPage } from './pages/MapPage'
import { Planning } from './pages/Planning'
import { RoutesWorkspace } from './pages/RoutesWorkspace'
import { Journeys } from './pages/Journeys'
import { Capture } from './pages/Capture'
import { VisitsWorkspace } from './pages/VisitsWorkspace'
import { Calls } from './pages/Calls'
import { Agenda } from './pages/Agenda'
import { Reception } from './pages/Reception'
import { Coverage } from './pages/Coverage'
import { ReportsV2 } from './pages/ReportsV2'
import { Admin } from './pages/Admin'
import { Settings } from './pages/Settings'
import { DataQuality } from './pages/DataQuality'
import { hasAnyAdminPermission, hasPermission, type PermissionKey } from './lib/access'

function RequirePermission({ permission, children }: { permission: PermissionKey; children: React.ReactNode }) {
  const { employee } = useAuth()
  return hasPermission(employee, permission) ? <>{children}</> : <Navigate to="/" replace />
}

function RequireAdministration({ children }: { children: React.ReactNode }) {
  const { employee } = useAuth()
  return hasAnyAdminPermission(employee) ? <>{children}</> : <Navigate to="/" replace />
}

function Protected(){
  const {session,loading}=useAuth()
  if(loading)return <div className="boot-screen"><img src="/logo-karaka.png"/><div className="boot-loader"><i/></div><span>Iniciando sistema...</span></div>
  if(!session)return <Login/>
  return <ThemeProvider><Routes><Route element={<AppShell/>}>
    <Route index element={<RequirePermission permission="dashboard.view"><DashboardWorkspace/></RequirePermission>}/>
    <Route path="clientes" element={<RequirePermission permission="clients.view"><Clients/></RequirePermission>}/>
    <Route path="mapa" element={<RequirePermission permission="map.view"><MapPage/></RequirePermission>}/>
    <Route path="planificacion" element={<RequirePermission permission="planning.view"><Planning/></RequirePermission>}/>
    <Route path="rutas" element={<RequirePermission permission="routes.view"><RoutesWorkspace/></RequirePermission>}/>
    <Route path="jornadas" element={<RequirePermission permission="journeys.view"><Journeys/></RequirePermission>}/>
    <Route path="captacion" element={<RequirePermission permission="capture.view"><Capture/></RequirePermission>}/>
    <Route path="cobertura" element={<RequirePermission permission="coverage.view"><Coverage/></RequirePermission>}/>
    <Route path="visitas" element={<RequirePermission permission="visits.view"><VisitsWorkspace/></RequirePermission>}/>
    <Route path="llamadas" element={<RequirePermission permission="calls.view"><Calls/></RequirePermission>}/>
    <Route path="agenda" element={<RequirePermission permission="agenda.view"><Agenda/></RequirePermission>}/>
    <Route path="recepcion" element={<RequirePermission permission="reception.view"><Reception/></RequirePermission>}/>
    <Route path="reportes" element={<RequirePermission permission="reports.view"><ReportsV2/></RequirePermission>}/>
    <Route path="calidad-datos" element={<RequirePermission permission="data_quality.view"><DataQuality/></RequirePermission>}/>
    <Route path="administracion" element={<RequireAdministration><Admin/></RequireAdministration>}/>
    <Route path="configuracion" element={<RequirePermission permission="settings.view"><Settings/></RequirePermission>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes></ThemeProvider>
}
export default function App(){return <BrowserRouter><Protected/></BrowserRouter>}

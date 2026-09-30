import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from './layouts/PublicLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import { AccueilPage } from './pages/public/AccueilPage'
import { ConnexionPage } from './pages/public/ConnexionPage'
import { InscriptionPage } from './pages/public/InscriptionPage'
import { AccesRefusePage, IntrouvablePage } from './pages/public/ErreurPages'
import { PatientDashboard } from './pages/patient/PatientDashboard'
import { ReservationPage } from './pages/patient/ReservationPage'
import { MesRendezVousPage } from './pages/patient/MesRendezVousPage'
import { ProfilPage } from './pages/shared/ProfilPage'
import { RendezVousDetailPage } from './pages/shared/RendezVousDetailPage'
import { AgendaPage } from './pages/dentiste/AgendaPage'
import { DisponibilitesPage } from './pages/dentiste/DisponibilitesPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminRendezVousPage } from './pages/admin/AdminRendezVousPage'
import { AdminDentistesPage } from './pages/admin/AdminDentistesPage'
import { AdminServicesPage } from './pages/admin/AdminServicesPage'
import { AdminUtilisateursPage } from './pages/admin/AdminUtilisateursPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<AccueilPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="connexion" element={<ConnexionPage />} />
          <Route path="inscription" element={<InscriptionPage />} />
        </Route>
        <Route path="acces-refuse" element={<AccesRefusePage />} />
        <Route path="*" element={<IntrouvablePage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['patient']} />}>
        <Route path="patient" element={<DashboardLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route path="nouveau-rendez-vous" element={<ReservationPage />} />
          <Route path="rendez-vous" element={<MesRendezVousPage />} />
          <Route path="rendez-vous/:id/modifier" element={<ReservationPage />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['dentiste']} />}>
        <Route path="dentiste" element={<DashboardLayout />}>
          <Route index element={<AgendaPage />} />
          <Route path="disponibilites" element={<DisponibilitesPage />} />
          <Route path="rendez-vous/:id" element={<RendezVousDetailPage />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="rendez-vous" element={<AdminRendezVousPage />} />
          <Route path="rendez-vous/:id" element={<RendezVousDetailPage />} />
          <Route path="dentistes" element={<AdminDentistesPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="utilisateurs" element={<AdminUtilisateursPage />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

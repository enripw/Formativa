/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PlayersList from "./pages/PlayersList";
import PlayerForm from "./pages/PlayerForm";
import PlayerDetails from "./pages/PlayerDetails";
import Login from "./pages/Login";
import UsersList from "./pages/UsersList";
import UserForm from "./pages/UserForm";
import TeamsList from "./pages/TeamsList";
import TeamForm from "./pages/TeamForm";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import TournamentsList from "./pages/TournamentsList";
import TournamentForm from "./pages/TournamentForm";
import TournamentDetails from "./pages/TournamentDetails";
import CategoryDetails from "./pages/CategoryDetails";
import MatchesList from "./pages/MatchesList";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { isConfigured } from "./lib/firebase";

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
        {!isConfigured && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-800 text-sm text-center">
            <strong>Aviso:</strong> Firebase no está configurado. La aplicación no podrá guardar ni cargar datos reales.
            Por favor, configura las variables de entorno en AI Studio.
          </div>
        )}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/jugadores" element={<PlayersList />} />
                    <Route path="/jugadores/nuevo" element={
                      <ProtectedRoute requireAdmin>
                        <PlayerForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/jugadores/editar/:id" element={
                      <ProtectedRoute requireAdmin>
                        <PlayerForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/jugadores/ver/:id" element={<PlayerDetails />} />
                    
                    <Route path="/usuarios" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <UsersList />
                      </ProtectedRoute>
                    } />
                    <Route path="/usuarios/nuevo" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <UserForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/usuarios/editar/:id" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <UserForm />
                      </ProtectedRoute>
                    } />

                    <Route path="/equipos" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <TeamsList />
                      </ProtectedRoute>
                    } />
                    <Route path="/equipos/nuevo" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <TeamForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/equipos/editar/:id" element={
                      <ProtectedRoute requireGlobalAdmin>
                        <TeamForm />
                      </ProtectedRoute>
                    } />

                    <Route path="/torneos" element={
                      <ProtectedRoute>
                        <TournamentsList />
                      </ProtectedRoute>
                    } />
                    <Route path="/torneos/nuevo" element={
                      <ProtectedRoute requireSuperAdmin>
                        <TournamentForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/torneos/editar/:id" element={
                      <ProtectedRoute requireSuperAdmin>
                        <TournamentForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/torneos/:id" element={
                      <ProtectedRoute>
                        <TournamentDetails />
                      </ProtectedRoute>
                    } />
                    <Route path="/torneos/:tournamentId/categoria/:categoryId" element={
                      <ProtectedRoute>
                        <CategoryDetails />
                      </ProtectedRoute>
                    } />
                    <Route path="/torneos/:tournamentId/categoria/:categoryId/partidos" element={
                      <ProtectedRoute>
                        <MatchesList />
                      </ProtectedRoute>
                    } />

                    <Route path="/configuracion" element={
                      <ProtectedRoute requireSuperAdmin>
                        <Settings />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

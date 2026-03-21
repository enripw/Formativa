/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { isConfigured } from "./lib/firebase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const Dashboard = lazy(() => import("./pages/Dashboard"));
const PlayersList = lazy(() => import("./pages/PlayersList"));
const PlayerForm = lazy(() => import("./pages/PlayerForm"));
const PlayerDetails = lazy(() => import("./pages/PlayerDetails"));
const Login = lazy(() => import("./pages/Login"));
const UsersList = lazy(() => import("./pages/UsersList"));
const UserForm = lazy(() => import("./pages/UserForm"));
const TeamsList = lazy(() => import("./pages/TeamsList"));
const TeamForm = lazy(() => import("./pages/TeamForm"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const TournamentsList = lazy(() => import("./pages/TournamentsList"));
const TournamentForm = lazy(() => import("./pages/TournamentForm"));
const TournamentDetails = lazy(() => import("./pages/TournamentDetails"));
const CategoryDetails = lazy(() => import("./pages/CategoryDetails"));
const MatchesList = lazy(() => import("./pages/MatchesList"));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <Router>
          {!isConfigured && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-800 text-sm text-center">
              <strong>Aviso:</strong> Firebase no está configurado. La aplicación no podrá guardar ni cargar datos reales.
              Por favor, configura las variables de entorno en AI Studio.
            </div>
          )}
          <Suspense fallback={<LoadingSpinner fullPage message="Cargando..." />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<LoadingSpinner fullPage message="Cargando sección..." />}>
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
                            <ProtectedRoute requireTournamentsEnabled>
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
                            <ProtectedRoute requireTournamentsEnabled>
                              <TournamentDetails />
                            </ProtectedRoute>
                          } />
                          <Route path="/torneos/:tournamentId/categoria/:categoryId" element={
                            <ProtectedRoute requireTournamentsEnabled>
                              <CategoryDetails />
                            </ProtectedRoute>
                          } />
                          <Route path="/torneos/:tournamentId/categoria/:categoryId/partidos" element={
                            <ProtectedRoute requireTournamentsEnabled>
                              <MatchesList />
                            </ProtectedRoute>
                          } />

                          <Route path="/configuracion" element={
                            <ProtectedRoute requireSuperAdmin>
                              <Settings />
                            </ProtectedRoute>
                          } />
                        </Routes>
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
          </Router>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

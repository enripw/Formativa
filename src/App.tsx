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
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { isConfigured } from "./lib/firebase";

export default function App() {
  return (
    <AuthProvider>
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
                      <ProtectedRoute requireSuperAdmin>
                        <UsersList />
                      </ProtectedRoute>
                    } />
                    <Route path="/usuarios/nuevo" element={
                      <ProtectedRoute requireSuperAdmin>
                        <UserForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/usuarios/editar/:id" element={
                      <ProtectedRoute requireSuperAdmin>
                        <UserForm />
                      </ProtectedRoute>
                    } />

                    <Route path="/equipos" element={
                      <ProtectedRoute requireSuperAdmin>
                        <TeamsList />
                      </ProtectedRoute>
                    } />
                    <Route path="/equipos/nuevo" element={
                      <ProtectedRoute requireSuperAdmin>
                        <TeamForm />
                      </ProtectedRoute>
                    } />
                    <Route path="/equipos/editar/:id" element={
                      <ProtectedRoute requireSuperAdmin>
                        <TeamForm />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

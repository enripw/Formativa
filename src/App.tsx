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
                    <Route path="/jugadores" element={<PlayersList />} />
                    <Route path="/jugadores/nuevo" element={<PlayerForm />} />
                    <Route path="/jugadores/editar/:id" element={<PlayerForm />} />
                    <Route path="/jugadores/ver/:id" element={<PlayerDetails />} />
                    <Route path="/usuarios" element={<UsersList />} />
                    <Route path="/usuarios/nuevo" element={<UserForm />} />
                    <Route path="/usuarios/editar/:id" element={<UserForm />} />
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

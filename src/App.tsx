/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PlayersList from "./pages/PlayersList";
import PlayerForm from "./pages/PlayerForm";
import { isConfigured } from "./lib/firebase";

export default function App() {
  return (
    <Router>
      {!isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-800 text-sm text-center">
          <strong>Aviso:</strong> Firebase no está configurado. La aplicación no podrá guardar ni cargar datos reales.
          Por favor, configura las variables de entorno en AI Studio.
        </div>
      )}
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jugadores" element={<PlayersList />} />
          <Route path="/jugadores/nuevo" element={<PlayerForm />} />
          <Route path="/jugadores/editar/:id" element={<PlayerForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

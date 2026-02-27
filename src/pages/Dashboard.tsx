import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { playerService } from "../services/playerService";
import { Player } from "../types";
import { Users, Activity, Eye } from "lucide-react";

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await playerService.getPlayers();
        setPlayers(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Jugadores</p>
            <p className="text-2xl font-bold text-gray-900">{players.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Registros Recientes</p>
            <p className="text-2xl font-bold text-gray-900">
              {players.filter(p => p.createdAt && p.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Últimos Jugadores Registrados</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {players.slice(0, 5).map((player) => (
            <div key={player.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{player.firstName} {player.lastName}</p>
                  <p className="text-sm text-gray-500">DNI: {player.dni}</p>
                </div>
              </div>
              <Link
                to={`/jugadores/ver/${player.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Ficha</span>
              </Link>
            </div>
          ))}
          {players.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No hay jugadores registrados aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

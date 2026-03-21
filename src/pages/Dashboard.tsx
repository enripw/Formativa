import { Link } from "react-router-dom";
import { playerService } from "../services/playerService";
import { teamService } from "../services/teamService";
import { userService } from "../services/userService";
import { Users, Activity, Eye, Trophy, LayoutGrid, ShieldCheck } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { ProgressiveImage } from "../components/ProgressiveImage";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user } = useAuth();
  const teamIdFilter = user?.role === 'team_admin' ? user?.teamId : undefined;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats', teamIdFilter, user?.role],
    queryFn: async () => {
      const [
        pCount,
        rpCount,
        rPlayers,
        tCount,
        uCount
      ] = await Promise.all([
        playerService.countPlayers(teamIdFilter),
        playerService.countRecentPlayers(teamIdFilter, 7),
        playerService.getRecentPlayers(teamIdFilter, 5),
        teamService.countTeams(),
        user?.role === 'admin' ? userService.countUsers() : Promise.resolve(0)
      ]);

      return {
        playersCount: pCount,
        recentPlayersCount: rpCount,
        recentPlayers: rPlayers,
        teamsCount: tCount,
        usersCount: uCount
      };
    }
  });

  if (isLoading) {
    return <LoadingSpinner message="Cargando panel de control..." />;
  }

  const { playersCount, recentPlayersCount, recentPlayers, teamsCount, usersCount } = stats || {
    playersCount: 0,
    recentPlayersCount: 0,
    recentPlayers: [],
    teamsCount: 0,
    usersCount: 0
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Jugadores</p>
            <p className="text-2xl font-bold text-gray-900">{playersCount}</p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Equipos</p>
                <p className="text-2xl font-bold text-gray-900">{teamsCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Usuarios del Sistema</p>
                <p className="text-2xl font-bold text-gray-900">{usersCount}</p>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Registros Recientes</p>
            <p className="text-2xl font-bold text-gray-900">
              {recentPlayersCount}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Últimos Jugadores Registrados</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentPlayers.map((player) => (
            <div key={player.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  <ProgressiveImage 
                    src={player.photoUrl} 
                    alt={player.firstName} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{player.firstName} {player.lastName}</p>
                  <p className="text-sm text-gray-500">DNI: {player.dni}</p>
                </div>
              </div>
              <Link
                to={`/jugadores/ver/${player.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Ficha</span>
              </Link>
            </div>
          ))}
          {recentPlayers.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No hay jugadores registrados aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

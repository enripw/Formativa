import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamService } from "../services/teamService";
import { Team } from "../types";
import { Plus, Edit, Trash2, Shield, RefreshCw } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

const PAGE_SIZE = 20;

export default function TeamsList() {
  const queryClient = useQueryClient();
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const { data: totalTeams = 0 } = useQuery({
    queryKey: ['teamsCount'],
    queryFn: () => teamService.countTeams(),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['teamsPaginated'],
    queryFn: async ({ pageParam = null }) => {
      return await teamService.getTeamsPaginated(PAGE_SIZE, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
    initialPageParam: null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['teamsCount'] });
      setTeamToDelete(null);
    },
    onError: (error: any) => {
      alert(error.message || "Error al eliminar el equipo");
      setTeamToDelete(null);
    }
  });

  const teams = data?.pages.flatMap(page => page.teams) || [];

  const confirmDelete = () => {
    if (teamToDelete?.id) {
      deleteMutation.mutate(teamToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipos</h1>
        <Link
          to="/equipos/nuevo"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Equipo</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingSpinner message="Cargando equipos..." />
          ) : isError ? (
            <div className="p-8 text-center text-red-500">Error al cargar los equipos.</div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron equipos.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Nombre del Equipo</th>
                  <th className="p-4 font-semibold text-gray-600">Fecha de Creación</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                          {team.logoUrl ? (
                            <img 
                              src={team.logoUrl} 
                              alt={team.name} 
                              className="w-full h-full object-contain p-1"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Shield className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="font-medium text-gray-900">{team.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/equipos/editar/${team.id}`}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => setTeamToDelete(team)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {!isLoading && hasNextPage && (
          <div className="p-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Cargar más equipos
            </button>
          </div>
        )}
        
        {!isLoading && teams.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
            Mostrando {teams.length} de {totalTeams} equipos.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar equipo?</h3>
              <p className="text-gray-500 text-sm">
                Estás a punto de eliminar el equipo <strong>{teamToDelete.name}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTeamToDelete(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center"
              >
                {deleteMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Sí, eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { tournamentService } from "../services/tournamentService";
import { Plus, Calendar, ChevronRight, Globe, Lock, RefreshCw } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const PAGE_SIZE = 20;

export default function TournamentsList() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';

  const { data: totalTournaments = 0 } = useQuery({
    queryKey: ['tournamentsCount'],
    queryFn: () => tournamentService.countTournaments(),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['tournamentsPaginated'],
    queryFn: async ({ pageParam = null }) => {
      return await tournamentService.getTournamentsPaginated(PAGE_SIZE, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
    initialPageParam: null,
  });

  const rawTournaments = data?.pages.flatMap(page => page.tournaments) || [];
  
  // Filter out non-public tournaments for non-super-admins
  const filteredData = isSuperAdmin ? rawTournaments : rawTournaments.filter(t => t.isPublic);
  // Sort by year descending
  const tournaments = [...filteredData].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
        {isSuperAdmin && (
          <Link
            to="/torneos/nuevo"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Torneo</span>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Cargando torneos..." />
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Error al cargar los torneos.</div>
        ) : tournaments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron torneos.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                to={`/torneos/${tournament.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {tournament.name}
                      {isSuperAdmin && (
                        tournament.isPublic ? 
                          <Globe className="w-4 h-4 text-green-500" title="Público" /> : 
                          <Lock className="w-4 h-4 text-gray-400" title="Privado" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">Año: {tournament.year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    tournament.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    tournament.status === 'leveling' ? 'bg-amber-100 text-amber-700' :
                    tournament.status === 'main' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {tournament.status === 'draft' ? 'Borrador' :
                     tournament.status === 'leveling' ? 'Nivelación' :
                     tournament.status === 'main' ? 'Principal' : 'Finalizado'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
        
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
              Cargar más torneos
            </button>
          </div>
        )}
        
        {!isLoading && tournaments.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
            Mostrando {tournaments.length} de {totalTournaments} torneos.
          </div>
        )}
      </div>
    </div>
  );
}

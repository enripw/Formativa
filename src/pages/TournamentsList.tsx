import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tournamentService } from "../services/tournamentService";
import { Tournament } from "../types/tournament";
import { Plus, Calendar, ChevronRight, Globe, Lock } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

export default function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await tournamentService.getTournaments();
      // Filter out non-public tournaments for non-super-admins
      const filteredData = isSuperAdmin ? data : data.filter(t => t.isPublic);
      // Sort by year descending
      setTournaments([...filteredData].sort((a, b) => b.year - a.year));
    } catch (error) {
      console.error("Error loading tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

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
        {loading ? (
          <LoadingSpinner message="Cargando torneos..." />
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
      </div>
    </div>
  );
}

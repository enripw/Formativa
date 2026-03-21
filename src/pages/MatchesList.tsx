import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "../services/tournamentService";
import { teamService } from "../services/teamService";
import { Match, Group, League } from "../types/tournament";
import { Team } from "../types";
import { ArrowLeft, Save, Edit2, X } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

export default function MatchesList() {
  const { tournamentId, categoryId } = useParams<{ tournamentId: string, categoryId: string }>();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const leagueId = searchParams.get('leagueId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ home: number | '', away: number | '' }>({ home: '', away: '' });
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlertMessage({ isOpen: true, title, message });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['matchesList', categoryId, groupId, leagueId],
    queryFn: async () => {
      if (!categoryId) return null;
      const [tData, mData, teamsData] = await Promise.all([
        tournamentId ? tournamentService.getTournament(tournamentId) : Promise.resolve(null),
        tournamentService.getMatches(categoryId),
        teamService.getTeams()
      ]);
      
      if (tData && !tData.isPublic && !isSuperAdmin) {
        throw new Error("Unauthorized");
      }
      
      let filteredMatches = mData;
      if (groupId) {
        filteredMatches = mData.filter(m => m.groupId === groupId);
      } else if (leagueId) {
        filteredMatches = mData.filter(m => m.leagueId === leagueId);
      }
      
      // Sort by round
      filteredMatches.sort((a, b) => a.round - b.round);
      
      const teamMap: Record<string, Team> = {};
      teamsData.forEach(t => {
        if (t.id) teamMap[t.id] = t;
      });
      
      return { matches: filteredMatches, teams: teamMap };
    },
    enabled: !!categoryId,
    retry: false,
  });

  const matches = data?.matches || [];
  const teams = data?.teams || {};

  if (isError) {
    navigate("/torneos");
    return null;
  }

  const handleEditClick = (match: Match) => {
    setEditingMatchId(match.id!);
    setEditScores({
      home: match.homeScore !== undefined ? match.homeScore : '',
      away: match.awayScore !== undefined ? match.awayScore : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setEditScores({ home: '', away: '' });
  };

  const handleSaveScore = async (matchId: string) => {
    if (editScores.home === '' || editScores.away === '') {
      showAlert("Error", "Por favor ingresa ambos resultados.");
      return;
    }

    setSaving(true);
    try {
      const homeScore = Number(editScores.home);
      const awayScore = Number(editScores.away);
      
      await tournamentService.updateMatch(matchId, {
        homeScore,
        awayScore,
        status: 'played'
      });
      
      await refetch();
      setEditingMatchId(null);
    } catch (error: any) {
      console.error("Error saving match score:", error);
      showAlert("Error", error.message || "Error al guardar el resultado");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Cargando partidos..." />;

  // Group matches by phase and round
  const matchesByPhaseAndRound: Record<string, Record<number, Match[]>> = {};
  matches.forEach(m => {
    if (!matchesByPhaseAndRound[m.phase]) {
      matchesByPhaseAndRound[m.phase] = {};
    }
    if (!matchesByPhaseAndRound[m.phase][m.round]) {
      matchesByPhaseAndRound[m.phase][m.round] = [];
    }
    matchesByPhaseAndRound[m.phase][m.round].push(m);
  });

  const phaseNames: Record<string, string> = {
    'leveling': 'Fase de Nivelación',
    'championship': 'Championship',
    'cup': 'Cup',
    'promotion': 'Promoción'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/torneos/${tournamentId}/categoria/${categoryId}`)}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>
          <p className="text-sm text-gray-500">
            {groupId ? 'Fase de Nivelación' : leagueId ? 'Liga Principal' : 'Todos los partidos'}
          </p>
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(matchesByPhaseAndRound).map(phase => (
          <div key={phase} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-2">{phaseNames[phase] || phase}</h2>
            
            {Object.keys(matchesByPhaseAndRound[phase]).sort((a, b) => Number(a) - Number(b)).map(roundStr => {
              const round = Number(roundStr);
              const roundMatches = matchesByPhaseAndRound[phase][round];
              
              return (
                <div key={`${phase}-${round}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Fecha {round}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {roundMatches.map(match => {
                  const homeTeam = teams[match.homeTeamId];
                  const awayTeam = teams[match.awayTeamId];
                  const isEditing = editingMatchId === match.id;
                  
                  // Skip BYE matches visually or show them as "Descansa"
                  if (match.homeTeamId === 'BYE' || match.awayTeamId === 'BYE') {
                    const realTeamId = match.homeTeamId === 'BYE' ? match.awayTeamId : match.homeTeamId;
                    const realTeam = teams[realTeamId];
                    return (
                      <div key={match.id} className="p-4 flex justify-center items-center bg-gray-50/50 text-gray-500 italic text-sm">
                        {realTeam?.name || 'Equipo'} tiene fecha libre
                      </div>
                    );
                  }

                  return (
                    <div key={match.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start flex-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-3 w-1/3 sm:w-48 justify-end text-right">
                          <span className="font-medium text-gray-900 truncate">{homeTeam?.name || 'Equipo Desconocido'}</span>
                          {homeTeam?.logoUrl && (
                            <img src={homeTeam.logoUrl} alt={homeTeam.name} className="w-8 h-8 object-contain shrink-0" />
                          )}
                        </div>
                        
                        {/* Score / Edit Inputs */}
                        <div className="flex items-center justify-center gap-2 w-24 shrink-0">
                          {isEditing ? (
                            <>
                              <input 
                                type="number" 
                                min="0"
                                value={editScores.home}
                                onChange={e => setEditScores({...editScores, home: e.target.value ? Number(e.target.value) : ''})}
                                className="w-10 h-10 text-center border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-bold"
                              />
                              <span className="text-gray-400 font-bold">-</span>
                              <input 
                                type="number" 
                                min="0"
                                value={editScores.away}
                                onChange={e => setEditScores({...editScores, away: e.target.value ? Number(e.target.value) : ''})}
                                className="w-10 h-10 text-center border border-gray-300 rounded-md focus:ring-primary focus:border-primary font-bold"
                              />
                            </>
                          ) : (
                            <div className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-gray-900 text-lg tracking-widest min-w-[80px] text-center">
                              {match.status === 'played' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                            </div>
                          )}
                        </div>
                        
                        {/* Away Team */}
                        <div className="flex items-center gap-3 w-1/3 sm:w-48 justify-start">
                          {awayTeam?.logoUrl && (
                            <img src={awayTeam.logoUrl} alt={awayTeam.name} className="w-8 h-8 object-contain shrink-0" />
                          )}
                          <span className="font-medium text-gray-900 truncate">{awayTeam?.name || 'Equipo Desconocido'}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveScore(match.id!)}
                                disabled={saving}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Guardar"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            !match.promotionResolved && (
                              <button
                                onClick={() => handleEditClick(match)}
                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Editar Resultado"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
          </div>
        ))}
        {matches.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            No hay partidos programados.
          </div>
        )}
      </div>

      <Modal
        isOpen={alertMessage.isOpen}
        onClose={() => setAlertMessage(prev => ({ ...prev, isOpen: false }))}
        title={alertMessage.title}
        footer={
          <button
            onClick={() => setAlertMessage(prev => ({ ...prev, isOpen: false }))}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
          >
            Aceptar
          </button>
        }
      >
        <p className="text-gray-600">{alertMessage.message}</p>
      </Modal>
    </div>
  );
}

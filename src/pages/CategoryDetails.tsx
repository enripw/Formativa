import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { tournamentService } from "../services/tournamentService";
import { teamService } from "../services/teamService";
import { Tournament, TournamentCategory, Group, Match, League, TeamStanding } from "../types/tournament";
import { Team } from "../types";
import { ArrowLeft, Trophy, Medal, Shield, ChevronRight } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { calculateStandings, generateMainLeagues, generateRoundRobinFixtures, generatePromotionMatch, resolvePromotionMatch } from "../services/tournamentLogic";
import Modal from "../components/Modal";
import { useAuth } from "../contexts/AuthContext";

export default function CategoryDetails() {
  const { tournamentId, categoryId } = useParams<{ tournamentId: string, categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [category, setCategory] = useState<TournamentCategory | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [alertMessage, setAlertMessage] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (tournamentId && categoryId) {
      loadData(tournamentId, categoryId);
    }
  }, [tournamentId, categoryId]);

  const loadData = async (tId: string, cId: string) => {
    try {
      setLoading(true);
      const [tData, cData, gData, lData, mData, teamsData] = await Promise.all([
        tournamentService.getTournament(tId),
        tournamentService.getCategories(tId),
        tournamentService.getGroups(cId),
        tournamentService.getLeagues(cId),
        tournamentService.getMatches(cId),
        teamService.getTeams()
      ]);
      
      if (tData && !tData.isPublic && !isSuperAdmin) {
        navigate("/torneos");
        return;
      }
      
      setTournament(tData);
      setCategory(cData.find(c => c.id === cId) || null);
      setGroups(gData);
      setLeagues(lData);
      setMatches(mData);
      
      const teamMap: Record<string, Team> = {};
      teamsData.forEach(t => {
        if (t.id) teamMap[t.id] = t;
      });
      setTeams(teamMap);
    } catch (error) {
      console.error("Error loading category details:", error);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    setAlertMessage({ isOpen: true, title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ isOpen: true, title, message, onConfirm });
  };

  const executeFinishLeveling = async (levelingMatches: Match[]) => {
    setGenerating(true);
    try {
      // Generate leagues
      const { championship, cup } = generateMainLeagues(tournamentId!, categoryId!, groups, levelingMatches);
      
      // Generate fixtures for leagues (double round-robin)
      const champMatches = generateRoundRobinFixtures(tournamentId!, categoryId!, 'championship', championship.id!, championship.teams, true);
      const cupMatches = generateRoundRobinFixtures(tournamentId!, categoryId!, 'cup', cup.id!, cup.teams, true);
      
      // Save to Firebase
      await tournamentService.saveLeagues([championship, cup]);
      await tournamentService.saveMatches([...champMatches, ...cupMatches]);
      
      // Update tournament status if not already main
      if (tournament!.status !== 'main') {
        await tournamentService.updateTournament(tournamentId!, { status: 'main' });
        setTournament({ ...tournament!, status: 'main' });
      }
      
      // Reload data
      await loadData(tournamentId!, categoryId!);
      showAlert("Éxito", "Ligas generadas con éxito.");
    } catch (error: any) {
      console.error("Error generating main leagues:", error);
      showAlert("Error", error.message || "Error al generar las ligas");
    } finally {
      setGenerating(false);
    }
  };

  const handleFinishLeveling = async () => {
    if (!tournament || !category || !tournamentId || !categoryId) return;
    
    // Check if all leveling matches are played
    const levelingMatches = matches.filter(m => m.phase === 'leveling');
    const unplayed = levelingMatches.filter(m => m.status !== 'played');
    
    if (unplayed.length > 0) {
      showConfirm(
        "Partidos sin jugar",
        `Aún hay ${unplayed.length} partidos sin jugar en la fase de nivelación. ¿Deseas finalizarla de todos modos?`,
        () => {
          setConfirmAction(prev => ({ ...prev, isOpen: false }));
          executeFinishLeveling(levelingMatches);
        }
      );
    } else {
      showConfirm(
        "Finalizar Nivelación",
        "¿Estás seguro de finalizar la fase de nivelación y generar las ligas Championship y Cup?",
        () => {
          setConfirmAction(prev => ({ ...prev, isOpen: false }));
          executeFinishLeveling(levelingMatches);
        }
      );
    }
  };

  const handleGeneratePromotion = async () => {
    if (!tournamentId || !categoryId) return;
    
    const champ = leagues.find(l => l.type === 'championship');
    const cup = leagues.find(l => l.type === 'cup');
    
    if (!champ || !cup) {
      showAlert("Error", "Faltan ligas para generar promoción.");
      return;
    }

    const mainMatches = matches.filter(m => m.phase === 'championship' || m.phase === 'cup');
    const promotionMatch = generatePromotionMatch(tournamentId, categoryId, champ, cup, mainMatches);
    
    if (!promotionMatch) {
      showAlert("Error", "No se pudo generar el partido de promoción (faltan posiciones).");
      return;
    }

    setGenerating(true);
    try {
      await tournamentService.saveMatches([promotionMatch]);
      await loadData(tournamentId, categoryId);
      showAlert("Éxito", "Partido de promoción generado con éxito.");
    } catch (error: any) {
      console.error("Error generating promotion match:", error);
      showAlert("Error", error.message || "Error al generar promoción");
    } finally {
      setGenerating(false);
    }
  };

  const executeResolvePromotion = async (match: Match, champ: League, cup: League) => {
    setGenerating(true);
    try {
      const mainMatches = matches.filter(m => m.phase === 'championship' || m.phase === 'cup');
      const { newChampionship, newCup, updatedMatches, resolvedMatch } = resolvePromotionMatch(match, champ, cup, mainMatches);
      await tournamentService.saveLeagues([newChampionship, newCup]);
      
      const matchesToSave = [...updatedMatches, resolvedMatch];
      await tournamentService.saveMatches(matchesToSave);
      
      await loadData(tournamentId!, categoryId!);
      showAlert("Éxito", "Promoción resuelta y ligas actualizadas.");
    } catch (error: any) {
      console.error("Error resolving promotion:", error);
      showAlert("Error", error.message || "Error al resolver promoción");
    } finally {
      setGenerating(false);
    }
  };

  const handleResolvePromotion = async (match: Match) => {
    if (match.status !== 'played') {
      showAlert("Error", "El partido debe estar jugado para resolver la promoción.");
      return;
    }
    
    const champ = leagues.find(l => l.type === 'championship');
    const cup = leagues.find(l => l.type === 'cup');
    
    if (!champ || !cup) return;

    showConfirm(
      "Resolver Promoción",
      "¿Estás seguro de resolver la promoción? Esto actualizará las ligas y no se puede deshacer fácilmente.",
      () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        executeResolvePromotion(match, champ, cup);
      }
    );
  };

  if (loading) return <LoadingSpinner message="Cargando categoría..." />;
  if (!category) return <div className="p-8 text-center">Categoría no encontrada</div>;

  const renderStandingsTable = (standings: TeamStanding[], title: string, isLeague: boolean = false) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {isLeague && title.includes('Championship') && <Trophy className="w-5 h-5 text-amber-500" />}
          {isLeague && title.includes('Cup') && <Medal className="w-5 h-5 text-gray-400" />}
          {!isLeague && <Shield className="w-5 h-5 text-blue-500" />}
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
              <th className="p-3 font-semibold text-center w-10">Pos</th>
              <th className="p-3 font-semibold">Equipo</th>
              <th className="p-3 font-semibold text-center" title="Partidos Jugados">PJ</th>
              <th className="p-3 font-semibold text-center" title="Ganados">G</th>
              <th className="p-3 font-semibold text-center" title="Empatados">E</th>
              <th className="p-3 font-semibold text-center" title="Perdidos">P</th>
              <th className="p-3 font-semibold text-center" title="Goles a Favor">GF</th>
              <th className="p-3 font-semibold text-center" title="Goles en Contra">GC</th>
              <th className="p-3 font-semibold text-center" title="Diferencia de Gol">DG</th>
              <th className="p-3 font-bold text-center text-primary">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {standings.map((s, index) => {
              const team = teams[s.teamId];
              if (!team && s.teamId !== 'BYE') return null;
              if (s.teamId === 'BYE') return null; // Skip BYE team in standings

              return (
                <tr key={s.teamId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-center font-medium text-gray-500">{index + 1}</td>
                  <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                    {team?.logoUrl && (
                      <img src={team.logoUrl} alt={team.name} className="w-6 h-6 object-contain" />
                    )}
                    {team?.name || 'Equipo Desconocido'}
                  </td>
                  <td className="p-3 text-center text-gray-600">{s.played}</td>
                  <td className="p-3 text-center text-green-600">{s.won}</td>
                  <td className="p-3 text-center text-gray-600">{s.drawn}</td>
                  <td className="p-3 text-center text-red-600">{s.lost}</td>
                  <td className="p-3 text-center text-gray-600">{s.goalsFor}</td>
                  <td className="p-3 text-center text-gray-600">{s.goalsAgainst}</td>
                  <td className="p-3 text-center font-medium text-gray-700">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                  <td className="p-3 text-center font-bold text-primary text-lg">{s.points}</td>
                </tr>
              );
            })}
            {standings.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">No hay equipos en este grupo/liga.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/torneos/${tournamentId}`)}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="text-sm text-gray-500">{tournament?.name}</p>
        </div>
      </div>

      {/* Leveling Phase */}
      {groups.length > 0 && leagues.length === 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Fase de Nivelación</h2>
            {isSuperAdmin && (
              <button
                onClick={handleFinishLeveling}
                disabled={generating}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? "Generando Ligas..." : "Finalizar Nivelación"}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {groups.map(group => {
              const groupMatches = matches.filter(m => m.groupId === group.id);
              const standings = calculateStandings(groupMatches, group.teams);
              return (
                <div key={group.id}>
                  {renderStandingsTable(standings, group.name)}
                  <div className="text-right mt-2">
                    <Link 
                      to={`/torneos/${tournamentId}/categoria/${categoryId}/partidos?groupId=${group.id}`}
                      className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Ver Partidos <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Leagues */}
      {leagues.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Ligas Principales</h2>
            {isSuperAdmin && (
              <button
                onClick={handleGeneratePromotion}
                disabled={generating}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? "Generando..." : "Generar Promoción"}
              </button>
            )}
          </div>
          
          {matches.filter(m => m.phase === 'promotion').length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-4">Partido de Promoción</h3>
              <div className="space-y-4">
                {matches.filter(m => m.phase === 'promotion').map(match => {
                  const homeTeam = teams[match.homeTeamId];
                  const awayTeam = teams[match.awayTeamId];
                  return (
                    <div key={match.id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-amber-100">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-900">{homeTeam?.name || 'Equipo'} (Cup)</span>
                        <div className="bg-gray-100 px-3 py-1 rounded-md font-bold">
                          {match.status === 'played' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                        </div>
                        <span className="font-medium text-gray-900">{awayTeam?.name || 'Equipo'} (Champ)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <>
                            <Link 
                              to={`/torneos/${tournamentId}/categoria/${categoryId}/partidos`}
                              className="text-sm text-primary hover:underline"
                            >
                              Editar Resultado
                            </Link>
                            {match.status === 'played' && !match.promotionResolved && (
                              <button
                                onClick={() => handleResolvePromotion(match)}
                                className="bg-amber-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
                              >
                                Resolver Ascenso/Descenso
                              </button>
                            )}
                          </>
                        )}
                        {match.promotionResolved && (
                          <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                            Promoción Resuelta
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {leagues.map(league => {
              const leagueMatches = matches.filter(m => m.leagueId === league.id);
              const standings = calculateStandings(leagueMatches, league.teams, league.teamReplacements);
              const title = league.type === 'championship' ? 'Championship' : 'Cup';
              return (
                <div key={league.id}>
                  {renderStandingsTable(standings, title, true)}
                  <div className="text-right mt-2">
                    <Link 
                      to={`/torneos/${tournamentId}/categoria/${categoryId}/partidos?leagueId=${league.id}`}
                      className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      Ver Partidos <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          La fase de nivelación aún no ha sido generada para esta categoría.
        </div>
      )}
      {/* Modals */}
      <Modal
        isOpen={confirmAction.isOpen}
        onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
        title={confirmAction.title}
        footer={
          <>
            <button
              onClick={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmAction.onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-gray-600">{confirmAction.message}</p>
      </Modal>

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

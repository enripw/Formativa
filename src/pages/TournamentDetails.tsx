import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { tournamentService } from "../services/tournamentService";
import { playerService } from "../services/playerService";
import { Tournament, TournamentCategory, Group, Match } from "../types/tournament";
import { Player } from "../types";
import { ArrowLeft, Play, Users, Trophy, ChevronRight, Trash2, Edit } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { getTeamsForCategory, generateGroups, generateRoundRobinFixtures } from "../services/tournamentLogic";
import Modal from "../components/Modal";

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    category: TournamentCategory;
    teamCount: number;
    isReady: boolean;
  }[]>([]);
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
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (tournamentId: string) => {
    try {
      setLoading(true);
      const [tData, cData, pData] = await Promise.all([
        tournamentService.getTournament(tournamentId),
        tournamentService.getCategories(tournamentId),
        playerService.getPlayers()
      ]);
      setTournament(tData);
      setCategories(cData);
      setPlayers(pData);
    } catch (error) {
      console.error("Error loading tournament details:", error);
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

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await tournamentService.deleteTournament(id!);
      navigate("/torneos");
    } catch (error: any) {
      console.error("Error deleting tournament:", error);
      showAlert("Error", error.message || "Error al eliminar el torneo");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!tournament || !id) return;
    
    showConfirm(
      "Eliminar Torneo",
      `¿Estás seguro de eliminar el torneo "${tournament.name}"? Esta acción no se puede deshacer y eliminará todos los partidos, grupos y ligas asociados.`,
      () => {
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
        executeDelete();
      }
    );
  };

  const handlePreStartLeveling = () => {
    const results = categories.map(category => {
      const teamIds = getTeamsForCategory(players, category);
      return {
        category,
        teamCount: teamIds.length,
        isReady: teamIds.length >= 6
      };
    });
    setValidationResults(results);
    setShowValidationModal(true);
  };

  const handleStartLeveling = async () => {
    if (!tournament || !id) return;
    
    setShowValidationModal(false);
    setGenerating(true);
    try {
      const allGroups: Group[] = [];
      const allMatches: Match[] = [];

      // Para cada categoría, obtener equipos y generar grupos
      for (const category of categories) {
        const teamIds = getTeamsForCategory(players, category);
        
        if (teamIds.length < 6) {
          console.warn(`La categoría ${category.name} no tiene suficientes equipos (${teamIds.length}). Se omitirá.`);
          continue;
        }

        const groups = generateGroups(id, category.id!, teamIds);
        allGroups.push(...groups);

        // Generar fixture para cada grupo
        for (const group of groups) {
          const matches = generateRoundRobinFixtures(id, category.id!, 'leveling', group.id!, group.teams, false);
          allMatches.push(...matches);
        }
      }

      if (allGroups.length === 0) {
        showAlert("Error", "No hay suficientes equipos en ninguna categoría para iniciar el torneo.");
        setGenerating(false);
        return;
      }

      // Guardar en Firebase
      await tournamentService.saveGroups(allGroups);
      await tournamentService.saveMatches(allMatches);
      
      // Actualizar estado del torneo
      await tournamentService.updateTournament(id, { status: 'leveling' });
      setTournament({ ...tournament, status: 'leveling' });
      
      showAlert("Éxito", "Fase de nivelación generada con éxito.");
    } catch (error: any) {
      console.error("Error generating leveling phase:", error);
      showAlert("Error", error.message || "Error al generar la fase de nivelación");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando torneo..." />;
  if (!tournament) return <div className="p-8 text-center">Torneo no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/torneos")}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
            <p className="text-sm text-gray-500">Año: {tournament.year} • Estado: {
              tournament.status === 'draft' ? 'Borrador' :
              tournament.status === 'leveling' ? 'Nivelación' :
              tournament.status === 'main' ? 'Principal' : 'Finalizado'
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/torneos/editar/${id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? <LoadingSpinner /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>

      {tournament.status === 'draft' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-amber-800">Fase de Nivelación</h3>
            <p className="text-sm text-amber-700 mt-1">
              El torneo está en borrador. Inicia la fase de nivelación para sortear los equipos en grupos y generar el fixture automáticamente.
            </p>
          </div>
          <button
            onClick={handlePreStartLeveling}
            disabled={generating}
            className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            {generating ? (
              <LoadingSpinner />
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Iniciar Nivelación
              </>
            )}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Categorías</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {categories.map((category) => {
            const teamCount = getTeamsForCategory(players, category).length;
            return (
              <Link
                key={category.id}
                to={`/torneos/${tournament.id}/categoria/${category.id}`}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-500">Años: {category.birthYears.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-bold text-gray-900">{teamCount}</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Equipos</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Validación del Torneo</h3>
              <p className="text-sm text-gray-500 mt-1">
                Comprobando los requisitos para iniciar la fase de nivelación.
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {validationResults.map((result, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${result.isReady ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-semibold ${result.isReady ? 'text-green-800' : 'text-red-800'}`}>
                        {result.category.name}
                      </h4>
                      <p className={`text-sm mt-1 ${result.isReady ? 'text-green-600' : 'text-red-600'}`}>
                        Equipos listos: {result.teamCount}
                      </p>
                    </div>
                    {result.isReady ? (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">OK</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Faltan {6 - result.teamCount}</span>
                    )}
                  </div>
                  {!result.isReady && (
                    <p className="text-xs text-red-500 mt-2">
                      Se necesitan al menos 6 equipos con jugadores en este rango de edad ({result.category.birthYears.join(', ')}). Esta categoría será omitida.
                    </p>
                  )}
                </div>
              ))}
              
              {validationResults.every(r => !r.isReady) && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg text-sm font-medium">
                  No hay ninguna categoría con suficientes equipos. No puedes iniciar el torneo.
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartLeveling}
                disabled={validationResults.every(r => !r.isReady) || generating}
                className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                Confirmar e Iniciar
              </button>
            </div>
          </div>
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

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { playerService } from "../services/playerService";
import { teamService } from "../services/teamService";
import { Player, Team } from "../types";
import { ArrowLeft, User, Calendar, CreditCard, Clock, Cake, Users, Download, IdCard, Trophy } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate, calculateAge } from "../lib/dateUtils";
import { useAuth } from "../contexts/AuthContext";
import { toPng } from "html-to-image";
import { useRef } from "react";

export default function PlayerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const credentialRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const isSuperAdmin = user?.role === 'admin';
  const isTeamAdmin = user?.role === 'team_admin';

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const playerData = await playerService.getPlayer(id!);
      if (playerData) {
        setPlayer(playerData);
        if (playerData.teamId) {
          const teamData = await teamService.getTeamById(playerData.teamId);
          setTeam(teamData);
        }
      }
    } catch (error) {
      console.error("Error loading player details:", error);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = isSuperAdmin || (isTeamAdmin && user?.teamId === player?.teamId);

  const generateCredential = async () => {
    if (!credentialRef.current) return;
    
    try {
      setIsGenerating(true);
      // Wait a bit for any images to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(credentialRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `credencial-${player.firstName}-${player.lastName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error generating credential:", error);
      alert("Error al generar la credencial. Intente nuevamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando ficha del jugador..." />;
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <p className="text-gray-500">No se encontró el jugador.</p>
        <button
          onClick={() => navigate("/jugadores")}
          className="text-emerald-600 font-medium hover:underline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Credential Template (Hidden from view but present in DOM for generation) */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={credentialRef}
          className="w-[350px] h-[630px] bg-white relative overflow-hidden flex flex-col items-center p-0"
          style={{ fontFamily: 'sans-serif' }}
        >
          {/* Background Pattern/Header */}
          <div className="w-full h-40 bg-gradient-to-br from-emerald-600 to-green-900 relative">
            <div className="absolute inset-0 opacity-20 flex items-center justify-center">
              <IdCard className="w-32 h-32 text-white" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent"></div>
          </div>

          {/* Photo Container */}
          <div className="relative -mt-20 mb-4">
            <div className="w-36 h-36 rounded-full border-8 border-white bg-gray-100 overflow-hidden shadow-xl">
              {player.photoUrl ? (
                <img 
                  src={player.photoUrl} 
                  alt={player.firstName} 
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="text-center px-6 w-full space-y-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                {player.firstName}
              </h2>
              <h2 className="text-2xl font-black text-emerald-700 uppercase tracking-tight leading-tight">
                {player.lastName}
              </h2>
            </div>

            <div className="h-1 w-16 bg-emerald-500 mx-auto rounded-full"></div>

            <div className="grid grid-cols-1 gap-3 text-left">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">DNI / Identificación</p>
                <p className="text-lg font-black text-gray-800 tracking-tight">{player.dni}</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha de Nacimiento</p>
                <p className="text-lg font-black text-gray-800 tracking-tight">{formatDate(player.birthDate)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto w-full p-5 bg-gray-900 text-white flex justify-between items-center">
            <div>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Liga Formativa</p>
              <p className="text-[10px] font-medium opacity-60">Credencial Oficial</p>
            </div>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Ficha del Jugador</h1>
        </div>
        
        <button
          onClick={generateCredential}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="w-5 h-5 text-emerald-600" />
          )}
          <span className="hidden sm:inline">Descargar Credencial</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-emerald-600 to-green-800"></div>
        
        <div className="px-6 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
              {player.photoUrl ? (
                <img src={player.photoUrl} alt={player.firstName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>

          <div className="text-center space-y-1 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {player.firstName} {player.lastName}
            </h2>
            <p className="text-gray-500 font-medium">Jugador Registrado</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI / Identificación</p>
                <p className="text-lg font-bold text-gray-800">{player.dni}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha de Nacimiento</p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(player.birthDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Edad Actual</p>
                <p className="text-lg font-bold text-gray-800">
                  {calculateAge(player.birthDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</p>
                <p className="text-lg font-bold text-gray-800">{team?.name || 'Sin equipo'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha de Registro</p>
                <p className="text-lg font-bold text-gray-800">
                  {player.createdAt ? new Date(player.createdAt).toLocaleString() : 'No disponible'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {canEdit && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/jugadores/editar/${player.id}`)}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all hover:bg-emerald-700 transition-colors flex-1 sm:flex-none"
          >
            Editar Información
          </button>
        </div>
      )}
    </div>
  );
}

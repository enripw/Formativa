import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { playerService } from "../services/playerService";
import { teamService } from "../services/teamService";
import { Player, Team } from "../types";
import { ArrowLeft, User, Calendar, CreditCard, Clock, Cake, Users, Download, IdCard, Trophy } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate, calculateAge } from "../lib/dateUtils";
import { useAuth } from "../contexts/AuthContext";
import { toJpeg } from "html-to-image";
import { useRef } from "react";
import CredentialTemplate from "../components/CredentialTemplate";
import { ProgressiveImage } from "../components/ProgressiveImage";

export default function PlayerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const credentialRef = useRef<HTMLDivElement>(null);
  const onReadyResolveRef = useRef<(() => void) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';
  const isTeamAdmin = user?.role === 'team_admin';
  const isAdmin = user?.role === 'admin';

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

  const canEdit = isAdmin || (isTeamAdmin && user?.teamId === player?.teamId);

  const generateCredential = async () => {
    if (!credentialRef.current) return;
    
    try {
      setIsGenerating(true);
      
      // Wait for images to load if they haven't already
      await new Promise<void>(resolve => {
        onReadyResolveRef.current = resolve;
        // Fallback timeout
        setTimeout(() => {
          if (onReadyResolveRef.current) {
            onReadyResolveRef.current();
            onReadyResolveRef.current = null;
          }
        }, 5000);
      });
      
      const dataUrl = await toJpeg(credentialRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        quality: 0.8,
      });
      
      const link = document.createElement('a');
      link.download = `credencial-${player.firstName}-${player.lastName}.jpg`;
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
    return <LoadingSpinner message="Cargando carnet del jugador..." />;
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <p className="text-gray-500">No se encontró el jugador.</p>
        <button
          onClick={() => navigate("/jugadores")}
          className="text-primary font-medium hover:underline"
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
        <CredentialTemplate 
          ref={credentialRef} 
          player={player} 
          onReady={() => {
            if (onReadyResolveRef.current) {
              onReadyResolveRef.current();
              onReadyResolveRef.current = null;
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Carnet del Jugador</h1>
        </div>
        
        {isSuperAdmin && (
          <button
            onClick={generateCredential}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-5 h-5 text-primary" />
            )}
            <span className="hidden sm:inline">Descargar Credencial</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-primary to-primary/80"></div>
        
        <div className="px-6 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md">
              <ProgressiveImage 
                src={player.photoUrl} 
                alt={player.firstName} 
                className="w-full h-full object-cover" 
              />
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
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI / Identificación</p>
                <p className="text-lg font-bold text-gray-800">
                  {player.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
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
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
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
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</p>
                <div className="flex items-center gap-2 mt-1">
                  {team?.logoUrl && (
                    <div className="w-6 h-6 rounded bg-white flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                      <img 
                        src={team.logoUrl} 
                        alt={team.name} 
                        className="w-full h-full object-contain p-0.5"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <p className="text-lg font-bold text-gray-800">{team?.name || 'Sin equipo'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Posición</p>
                <p className="text-lg font-bold text-gray-800">{player.position || 'No especificada'}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</p>
                <p className="text-lg font-bold text-gray-800">
                  {player.birthDate ? player.birthDate.split('-')[0] : 'No especificada'}
                </p>
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
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex-1 sm:flex-none"
          >
            Editar Información
          </button>
        </div>
      )}
    </div>
  );
}

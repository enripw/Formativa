import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { playerService } from "../services/playerService";
import { Player } from "../types";
import { ArrowLeft, User, Calendar, CreditCard, Clock } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PlayerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      playerService.getPlayer(id).then((data) => {
        setPlayer(data);
        setLoading(false);
      });
    }
  }, [id]);

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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Ficha del Jugador</h1>
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
                  {new Date(player.birthDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl md:col-span-2">
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
      
      <div className="flex justify-center">
        <button
          onClick={() => navigate(`/jugadores/editar/${player.id}`)}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all hover:bg-emerald-700 transition-colors flex-1 sm:flex-none"
        >
          Editar Información
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { playerService } from "../services/playerService";
import { teamService } from "../services/teamService";
import { Player, Team } from "../types";
import { Camera, Upload, User, ArrowLeft, AlertCircle, Users } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { ProgressiveImage } from "../components/ProgressiveImage";

export default function PlayerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const isTeamAdmin = user?.role === 'team_admin';

  const [error, setError] = useState<string | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    dni: "",
    teamId: "",
    position: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamService.getTeams(),
    enabled: isAdmin,
  });

  const { data: playerData, isLoading: isLoadingPlayer } = useQuery({
    queryKey: ['player', id],
    queryFn: () => playerService.getPlayer(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (playerData) {
      setFormData({
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        birthDate: playerData.birthDate,
        dni: playerData.dni,
        teamId: playerData.teamId,
        position: playerData.position || "",
      });
      if (playerData.photoUrl) {
        setPhotoPreview(playerData.photoUrl);
      }
    } else if (!id && isTeamAdmin && user?.teamId) {
      setFormData(prev => ({ ...prev, teamId: user.teamId! }));
    }
  }, [playerData, id, isTeamAdmin, user?.teamId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const existingPlayer = await playerService.checkDniExists(formData.dni);
      if (existingPlayer && existingPlayer.id !== id) {
        throw new Error(`El DNI ${formData.dni} ya está registrado a nombre de: ${existingPlayer.firstName} ${existingPlayer.lastName}.`);
      }

      const savePromise = id 
        ? playerService.updatePlayer(id, formData, photoFile || undefined)
        : playerService.addPlayer(formData, photoFile || undefined);
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("La operación tardó demasiado (30s). Si estás intentando subir una foto, intenta guardar sin foto primero para descartar problemas con Firebase Storage.")), 30000)
      );

      return Promise.race([savePromise, timeoutPromise]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['player', id] });
      navigate("/jugadores");
    },
    onError: (err: any) => {
      console.error("Error saving player:", err);
      setError(err.message || "Error al guardar el jugador. Verifica la configuración y permisos de Firebase.");
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño de la imagen (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen es demasiado grande. El tamaño máximo permitido es 5MB.");
        // Limpiar el input
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        if (galleryInputRef.current) galleryInputRef.current.value = "";
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que todos los campos estén completos
    if (!formData.firstName || !formData.lastName || !formData.dni || !formData.birthDate || !formData.teamId) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    setError(null);
    mutation.mutate();
  };

  if (isLoadingPlayer || (isAdmin && isLoadingTeams)) {
    return <LoadingSpinner message="Cargando datos del jugador..." />;
  }

  const teams = teamsData || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/jugadores")}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? "Editar Jugador" : "Nuevo Jugador"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            <ProgressiveImage 
              src={photoPreview || undefined} 
              alt="Preview" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Tomar Foto
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Subir Foto
            </button>
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500 text-center max-w-xs">
            Puedes usar la cámara de tu dispositivo o seleccionar una imagen de la galería.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. Lionel"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Apellido
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. Messi"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
              DNI
            </label>
            <input
              type="text"
              id="dni"
              name="dni"
              required
              value={formData.dni}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. 12345678"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              required
              value={formData.birthDate}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              Posición
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. Delantero"
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <label htmlFor="teamId" className="block text-sm font-medium text-gray-700">
                Equipo
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  id="teamId"
                  name="teamId"
                  required
                  value={formData.teamId}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white"
                >
                  <option value="">Seleccionar equipo...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate("/jugadores")}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2 bg-primary rounded-lg text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="animate-bounce">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 12h.01" />
                    <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
                  </svg>
                </div>
                Guardando...
              </>
            ) : (
              "Guardar Jugador"
            )}
          </button>
        </div>
      </form>

      {/* Error Popup Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-semibold">Atención</h3>
            </div>
            <p className="text-gray-600 text-sm">{error}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

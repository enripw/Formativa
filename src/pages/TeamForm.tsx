import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teamService } from "../services/teamService";
import { Team } from "../types";
import { ArrowLeft, AlertCircle, Shield } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TeamForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<Omit<Team, "id" | "createdAt">>({
    name: "",
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadTeam(id);
    }
  }, [id, isEditing]);

  const loadTeam = async (teamId: string) => {
    try {
      const team = await teamService.getTeamById(teamId);
      if (team) {
        setFormData({
          name: team.name,
        });
      } else {
        navigate("/equipos");
      }
    } catch (err) {
      console.error("Error loading team:", err);
      navigate("/equipos");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && id) {
        await teamService.updateTeam(id, formData);
      } else {
        await teamService.createTeam(formData);
      }
      navigate("/equipos");
    } catch (err: any) {
      setError(err.message || "Error al guardar el equipo");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner message="Cargando datos del equipo..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/equipos")}
          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Editar Equipo" : "Nuevo Equipo"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Equipo
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border outline-none transition-all"
                  placeholder="Ej. Club Atlético"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate("/equipos")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Equipo"}
          </button>
        </div>
      </form>
    </div>
  );
}

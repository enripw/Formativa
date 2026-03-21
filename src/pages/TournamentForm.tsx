import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tournamentService } from "../services/tournamentService";
import { generateCategories } from "../services/tournamentLogic";
import { ArrowLeft, AlertCircle } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TournamentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    isPublic: false,
  });

  const [categories, setCategories] = useState<{ id?: string, name: string; years: string }[]>([
    { name: "Categoría 2010-2011", years: "2010,2011" },
    { name: "Categoría 2012-2013", years: "2012,2013" },
    { name: "Categoría 2014-2015", years: "2014,2015" },
    { name: "Categoría 2016", years: "2016" },
  ]);

  const { data: tournamentData, isLoading: isLoadingTournament } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => {
      if (!id) return null;
      const [tData, cData] = await Promise.all([
        tournamentService.getTournament(id),
        tournamentService.getCategories(id)
      ]);
      return { tournament: tData, categories: cData };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (tournamentData?.tournament) {
      setFormData({
        name: tournamentData.tournament.name,
        year: tournamentData.tournament.year,
        isPublic: tournamentData.tournament.isPublic || false,
      });
    }

    if (tournamentData?.categories && tournamentData.categories.length > 0) {
      setCategories(tournamentData.categories.map(c => ({
        id: c.id,
        name: c.name,
        years: c.birthYears.join(',')
      })));
    }
  }, [tournamentData]);

  const mutation = useMutation({
    mutationFn: async () => {
      let tournamentId = id;

      if (id) {
        // Update existing
        await tournamentService.updateTournament(id, {
          name: formData.name,
          year: formData.year,
          isPublic: formData.isPublic,
        });
      } else {
        // Create new
        tournamentId = await tournamentService.createTournament({
          name: formData.name,
          year: formData.year,
          status: 'draft',
          isPublic: formData.isPublic,
        });
      }

      // Parse and generate categories
      const defs = categories.map(c => ({
        name: c.name,
        birthYears: c.years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y))
      }));

      // For simplicity, we just overwrite categories. 
      // In a real app, you'd want to carefully merge/update to not lose existing groups/matches
      const generatedCategories = generateCategories(tournamentId!, formData.year, defs);
      
      // Keep existing IDs if they match by name (basic merge)
      const mergedCategories = generatedCategories.map(gc => {
        const existing = categories.find(c => c.name === gc.name && c.id);
        if (existing) {
          return { ...gc, id: existing.id };
        }
        return gc;
      });

      await tournamentService.saveCategories(mergedCategories);
      return tournamentId;
    },
    onSuccess: (tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      navigate(`/torneos/${tournamentId}`);
    },
    onError: (err: any) => {
      setError(err.message || "Error al guardar el torneo");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  if (!!id && isLoadingTournament) return <LoadingSpinner message="Cargando torneo..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(id ? `/torneos/${id}` : "/torneos")}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{id ? "Editar Torneo" : "Nuevo Torneo"}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Torneo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 border"
                placeholder="Ej. Torneo Apertura 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año del Torneo
              </label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <div>
              <label htmlFor="isPublic" className="font-medium text-gray-900 block">
                Torneo Público
              </label>
              <p className="text-sm text-gray-500">
                Si está activado, todos los usuarios podrán ver el fixture y resultados.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Categorías</h3>
            <p className="text-sm text-gray-500 mb-4">
              Define las categorías basadas en los años de nacimiento. Separa los años con comas.
            </p>
            
            <div className="space-y-4">
              {categories.map((cat, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => {
                        const newCats = [...categories];
                        newCats[index].name = e.target.value;
                        setCategories(newCats);
                      }}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 border"
                      placeholder="Nombre de la categoría"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cat.years}
                      onChange={(e) => {
                        const newCats = [...categories];
                        newCats[index].years = e.target.value;
                        setCategories(newCats);
                      }}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm p-2 border"
                      placeholder="Ej. 2010, 2011"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newCats = [...categories];
                      newCats.splice(index, 1);
                      setCategories(newCats);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCategories([...categories, { name: "", years: "" }])}
                className="text-sm text-primary font-medium hover:underline"
              >
                + Añadir Categoría
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate("/torneos")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : id ? "Guardar Cambios" : "Crear Torneo"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { playerService } from "../services/playerService";
import { Player } from "../types";
import { Plus, Edit, Trash2, Search, User, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setLoading(true);
      const data = await playerService.getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!playerToDelete?.id) return;
    setIsDeleting(true);
    try {
      await playerService.deletePlayer(playerToDelete.id);
      setPlayers(players.filter((p) => p.id !== playerToDelete.id));
      setPlayerToDelete(null);
    } catch (error) {
      console.error("Error deleting player:", error);
      alert("Error al eliminar el jugador. Verifica los permisos de Firebase.");
    } finally {
      setIsDeleting(false);
    }
  }

  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const generatePDF = async () => {
    if (players.length === 0) return;
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text("Lista de Jugadores Registrados", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total de jugadores: ${players.length}`, 14, 35);

      // Pre-load images to avoid issues during table generation
      const playersWithImages = await Promise.all(
        players.map(async (p) => {
          let base64 = "";
          if (p.photoUrl) {
            try {
              base64 = await getBase64ImageFromURL(p.photoUrl);
            } catch (e) {
              console.warn(`No se pudo cargar la imagen para ${p.firstName}`, e);
            }
          }
          return { ...p, base64 };
        })
      );

      autoTable(doc, {
        startY: 45,
        head: [['Foto', 'Nombre', 'Apellido', 'DNI', 'Fecha Nac.']],
        body: playersWithImages.map(p => [
          "", // Placeholder for image
          p.firstName,
          p.lastName,
          p.dni,
          new Date(p.birthDate).toLocaleDateString()
        ]),
        columnStyles: {
          0: { cellWidth: 25 },
        },
        styles: {
          valign: 'middle',
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const player = playersWithImages[data.row.index];
            if (player.base64) {
              doc.addImage(
                player.base64, 
                'JPEG', 
                data.cell.x + 5, 
                data.cell.y + 2, 
                15, 
                15
              );
            }
          }
        },
        rowPageBreak: 'avoid',
        margin: { top: 45 },
      });

      doc.save(`lista_jugadores_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF. Asegúrate de que las imágenes carguen correctamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredPlayers = players.filter(
    (p) =>
      p.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.dni.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={generatePDF}
            disabled={isExporting || players.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 sm:flex-none disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileDown className="w-5 h-5" />
            )}
            PDF
          </button>
          <Link
            to="/jugadores/nuevo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex-1 sm:flex-none"
          >
            <Plus className="w-5 h-5" />
            Nuevo
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando jugadores...</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron jugadores.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-medium text-gray-500 text-sm">Jugador</th>
                  <th className="p-4 font-medium text-gray-500 text-sm hidden sm:table-cell">DNI</th>
                  <th className="p-4 font-medium text-gray-500 text-sm hidden md:table-cell">Fecha Nac.</th>
                  <th className="p-4 font-medium text-gray-500 text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-sm text-gray-500 sm:hidden">DNI: {player.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 hidden sm:table-cell">{player.dni}</td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">
                      {new Date(player.birthDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/jugadores/editar/${player.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => setPlayerToDelete(player)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar jugador?</h3>
              <p className="text-gray-500 text-sm">
                Estás a punto de eliminar a <strong>{playerToDelete.firstName} {playerToDelete.lastName}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPlayerToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Sí, eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

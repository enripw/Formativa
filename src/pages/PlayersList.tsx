import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { playerService } from "../services/playerService";
import { teamService } from "../services/teamService";
import { Player, Team } from "../types";
import { Plus, Edit, Trash2, Search, User, FileDown, Eye, Users, CreditCard, ChevronDown, FileText, Table } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../lib/dateUtils";
import { toJpeg } from "html-to-image";
import CredentialTemplate from "../components/CredentialTemplate";

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCredentials, setIsExportingCredentials] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [currentPlayerForBatch, setCurrentPlayerForBatch] = useState<Player | null>(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [showTeamSelectModal, setShowTeamSelectModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  const credentialRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeamAdmin = user?.role === 'team_admin';
  const canManagePlayers = isAdmin || isTeamAdmin;

  useEffect(() => {
    fetchPlayers();
    if (isAdmin) {
      fetchTeams();
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user, isAdmin]);

  async function fetchTeams() {
    try {
      const data = await teamService.getTeams();
      const teamMap: Record<string, string> = {};
      data.forEach(t => {
        if (t.id) teamMap[t.id] = t.name;
      });
      setTeams(teamMap);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  }

  async function fetchPlayers() {
    try {
      setLoading(true);
      const teamIdFilter = isTeamAdmin ? user?.teamId : undefined;
      const data = await playerService.getPlayers(teamIdFilter);
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

  const generateCSV = () => {
    if (players.length === 0) return;

    const headers = ["Nombre", "Apellido", "DNI", "Fecha Nacimiento", "Equipo"];
    const rows = players.map(p => [
      p.firstName,
      p.lastName,
      p.dni,
      formatDate(p.birthDate),
      teams[p.teamId] || "Sin equipo"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `lista_jugadores_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = async () => {
    if (players.length === 0) return;
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Try to load the club logo
      let logoBase64 = "";
      try {
        // Use the same logo as login but ensure it's loaded as JPEG/PNG correctly
        logoBase64 = await getBase64ImageFromURL("https://i.ibb.co/LdLWNxsb/image.png");
      } catch (e) {
        console.warn("No se pudo cargar el logo del club para el PDF", e);
      }

      // Header
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 14, 10, 25, 25);
        doc.setFontSize(18);
        doc.setTextColor(5, 150, 105); // Emerald-600
        doc.text("LIGA FORMATIVA", 45, 20);
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text("Lista de Jugadores Registrados", 45, 28);
        
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 45, 35);
      } else {
        doc.setFontSize(20);
        doc.setTextColor(5, 150, 105); // Emerald-600
        doc.text("Lista de Jugadores Registrados", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);
      }

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
        startY: logoBase64 ? 45 : 40,
        head: [['Foto', 'Nombre', 'Apellido', 'DNI', 'Equipo', 'Fecha Nac.']],
        body: playersWithImages.map(p => [
          "", // Placeholder for image
          p.firstName,
          p.lastName,
          p.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
          teams[p.teamId] || "Sin equipo",
          formatDate(p.birthDate)
        ]),
        columnStyles: {
          0: { cellWidth: 20 },
        },
        styles: {
          valign: 'middle',
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const player = playersWithImages[data.row.index];
            if (player.base64) {
              const x = data.cell.x + 2;
              const y = data.cell.y + 2;
              const size = 12;
              
              doc.addImage(
                player.base64, 
                'JPEG', 
                x, 
                y, 
                size, 
                size,
                undefined,
                'FAST'
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

  const generateBatchCredentialsPDF = async (teamId?: string) => {
    let playersToProcess = filteredPlayers;
    
    if (teamId) {
      playersToProcess = players.filter(p => p.teamId === teamId);
    }

    if (playersToProcess.length === 0) {
      if (teamId) alert("No hay jugadores en este equipo.");
      return;
    }

    setIsExportingCredentials(true);
    setBatchProgress({ current: 0, total: playersToProcess.length });

    try {
      // Create PDF with custom size 90x50mm
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [90, 50]
      });

      for (let i = 0; i < playersToProcess.length; i++) {
        const player = playersToProcess[i];
        setBatchProgress({ current: i + 1, total: playersToProcess.length });
        setCurrentPlayerForBatch(player);

        // Wait for React to render the template and images to load
        await new Promise(resolve => setTimeout(resolve, 800));

        if (credentialRef.current) {
          const dataUrl = await toJpeg(credentialRef.current, {
            pixelRatio: 2,
            cacheBust: true,
            quality: 0.8,
          });

          if (i > 0) {
            doc.addPage([90, 50], 'landscape');
          }

          // Calculate dimensions to fit 90x50 while maintaining aspect ratio
          // Template is 1000x630 (1.587 ratio)
          // 90x50 is 1.8 ratio
          // Height 50mm -> Width 50 * 1.587 = 79.35mm
          const imgWidth = 50 * (1000 / 630);
          const imgHeight = 50;
          const xOffset = (90 - imgWidth) / 2;

          doc.addImage(dataUrl, 'JPEG', xOffset, 0, imgWidth, imgHeight);
        }
      }

      const fileName = teamId 
        ? `credenciales_${teams[teamId] || 'equipo'}_${new Date().toISOString().split('T')[0]}.pdf`
        : `credenciales_filtrados_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);
    } catch (error) {
      console.error("Error generating batch credentials:", error);
      alert("Error al generar las credenciales. Intente nuevamente.");
    } finally {
      setIsExportingCredentials(false);
      setCurrentPlayerForBatch(null);
    }
  };

  const filteredPlayers = players.filter(
    (p) => {
      const matchesSearch = 
        p.firstName.toLowerCase().includes(search.toLowerCase()) ||
        p.lastName.toLowerCase().includes(search.toLowerCase()) ||
        p.dni.includes(search);
      
      const matchesTeam = teamFilter === "" || p.teamId === teamFilter;
      
      return matchesSearch && matchesTeam;
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          {/* Dropdown for Downloads */}
          <div className="relative flex-1 sm:flex-none" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <FileDown className="w-5 h-5 text-emerald-600" />
              <span className="hidden xs:inline">Exportar</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    generatePDF();
                    setShowDownloadMenu(false);
                  }}
                  disabled={isExporting || players.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Descargar PDF
                </button>
                
                <button
                  onClick={() => {
                    generateCSV();
                    setShowDownloadMenu(false);
                  }}
                  disabled={players.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Table className="w-4 h-4" />
                  Descargar CSV
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  onClick={() => {
                    generateBatchCredentialsPDF();
                    setShowDownloadMenu(false);
                  }}
                  disabled={isExportingCredentials || players.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isExportingCredentials ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Credenciales (Filtrados)
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowTeamSelectModal(true);
                      setShowDownloadMenu(false);
                    }}
                    disabled={isExportingCredentials || Object.keys(teams).length === 0}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Users className="w-4 h-4" />
                    Credenciales por Equipo
                  </button>
                )}
              </div>
            )}
          </div>

          {canManagePlayers && (
            <Link
              to="/jugadores/nuevo"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex-1 sm:flex-none whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nuevo
            </Link>
          )}
        </div>
      </div>

      {/* Hidden Credential Template for Batch Processing */}
      <div className="fixed -left-[9999px] top-0">
        {currentPlayerForBatch && (
          <CredentialTemplate ref={credentialRef} player={currentPlayerForBatch} />
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          {isAdmin && (
            <div className="w-full md:w-64">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-700"
              >
                <option value="">Todos los equipos</option>
                {Object.entries(teams).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSpinner message="Cargando jugadores..." />
          ) : filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron jugadores.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-medium text-gray-500 text-sm">Jugador</th>
                  {isAdmin && <th className="p-4 font-medium text-gray-500 text-sm hidden lg:table-cell">Equipo</th>}
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
                          <div className="flex flex-col sm:hidden">
                            <p className="text-sm text-gray-500">DNI: {player.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</p>
                            {isAdmin && (
                              <p className="text-xs text-emerald-600 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {teams[player.teamId] || 'Sin equipo'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-gray-600 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{teams[player.teamId] || 'Sin equipo'}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-4 text-gray-600 hidden sm:table-cell">
                      {player.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    </td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">
                      {formatDate(player.birthDate)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/jugadores/ver/${player.id}`}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Ver Ficha"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        {canManagePlayers && (
                          <>
                            <Link
                              to={`/jugadores/editar/${player.id}`}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => setPlayerToDelete(player)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
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

      {/* Team Selection Modal for Batch Credentials */}
      {showTeamSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Generar Credenciales por Equipo</h3>
              <p className="text-gray-500 text-sm">
                Selecciona un equipo para generar las credenciales de todos sus jugadores.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-1">
              {Object.entries(teams).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => {
                    generateBatchCredentialsPDF(id);
                    setShowTeamSelectModal(false);
                  }}
                  className="flex items-center justify-between p-3 text-left hover:bg-emerald-50 rounded-lg border border-gray-100 transition-colors group"
                >
                  <span className="font-medium text-gray-700 group-hover:text-emerald-700">{name}</span>
                  <FileDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-500" />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowTeamSelectModal(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Progress Overlay */}
      {isExportingCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                ⚽️
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Generando Credenciales</h3>
              <p className="text-gray-500 text-sm">
                Procesando jugador {batchProgress.current} de {batchProgress.total}
              </p>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              ></div>
            </div>

            {currentPlayerForBatch && (
              <p className="text-xs text-emerald-600 font-medium animate-pulse">
                {currentPlayerForBatch.firstName} {currentPlayerForBatch.lastName}
              </p>
            )}

            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              Por favor, no cierres esta ventana
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

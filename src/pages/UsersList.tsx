import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userService } from "../services/userService";
import { teamService } from "../services/teamService";
import { User, Team } from "../types";
import { Plus, Edit, Trash2, Mail, Shield, Eye, Users } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, teamsData] = await Promise.all([
        userService.getUsers(),
        teamService.getTeams()
      ]);
      
      const teamMap: Record<string, string> = {};
      teamsData.forEach(t => {
        if (t.id) teamMap[t.id] = t.name;
      });
      
      setUsers(usersData);
      setTeams(teamMap);
    } catch (error) {
      console.error("Error loading users data:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete?.id) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (error: any) {
      alert(error.message || "Error al eliminar el usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <Link
          to="/usuarios/nuevo"
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <LoadingSpinner message="Cargando usuarios..." />
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron usuarios.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Nombre</th>
                  <th className="p-4 font-semibold text-gray-600">Email</th>
                  <th className="p-4 font-semibold text-gray-600">Rol</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.role === 'admin' || !user.role ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full w-fit text-sm font-medium">
                          <Shield className="w-4 h-4" />
                          Administrador
                        </div>
                      ) : user.role === 'team_admin' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full w-fit text-sm font-medium">
                            <Users className="w-4 h-4" />
                            Admin de Equipo
                          </div>
                          {user.teamId && (
                            <div className="text-xs text-gray-500 pl-1">
                              {teams[user.teamId] || 'Equipo no encontrado'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          Visualizador
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/usuarios/editar/${user.id}`}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        {currentUser?.id !== user.id && user.email !== 'enripw@gmail.com' && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
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
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">¿Eliminar usuario?</h3>
              <p className="text-gray-500 text-sm">
                Estás a punto de eliminar a <strong>{userToDelete.name}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
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

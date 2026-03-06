import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Shield, LogOut, Trophy, User, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { settings } = useSettings();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isSuperAdmin = user?.role === 'admin' && user?.email === 'enripw@gmail.com';
  const isGlobalAdmin = user?.role === 'admin';

  const navItems = [
    { name: "P. Control", href: "/", icon: LayoutDashboard },
    { name: "Jugadores", href: "/jugadores", icon: Users },
    ...(isGlobalAdmin ? [
      { name: "Equipos", href: "/equipos", icon: Trophy },
      { name: "Usuarios", href: "/usuarios", icon: Shield },
    ] : []),
    ...(isSuperAdmin ? [
      { name: "Conf.", href: "/configuracion", icon: SettingsIcon }
    ] : []),
    { name: "Mi Perfil", href: "/perfil", icon: User },
  ];

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-center gap-3">
          <img 
            src={settings.logoUrl || "https://firebasestorage.googleapis.com/v0/b/ligaformativa-3db31.firebasestorage.app/o/players%2Flogo.png?alt=media"} 
            alt="Logo" 
            className="w-10 h-10 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {settings.appName}
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user?.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                user?.name?.charAt(0) || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-[var(--primary-color)]" : "text-gray-500"
              )}
            >
              <item.icon className="w-6 h-6" />
              {item.name}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-xs font-medium text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
          Salir
        </button>
      </nav>
    </div>
  );
}

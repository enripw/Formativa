import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('liga_formativa_current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    if (!user?.id) return;
    const updatedUser = await userService.getUserById(user.id);
    if (updatedUser) {
      const userSession = { ...updatedUser };
      delete userSession.password;
      setUser(userSession);
      localStorage.setItem('liga_formativa_current_user', JSON.stringify(userSession));
    }
  };

  const login = async (email: string, password: string) => {
    const users = await userService.getUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      // Don't store password in session
      const userSession = { ...foundUser };
      delete userSession.password;
      
      setUser(userSession);
      localStorage.setItem('liga_formativa_current_user', JSON.stringify(userSession));
    } else {
      throw new Error('Credenciales incorrectas');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('liga_formativa_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

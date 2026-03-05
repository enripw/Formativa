import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { User as UserIcon, Mail, Lock, Save, AlertCircle, CheckCircle, Camera, Upload } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { ProgressiveImage } from '../components/ProgressiveImage';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.photoUrl) {
        setPhotoPreview(user.photoUrl);
      }
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'La imagen es demasiado grande. Máximo 5MB.' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setMessage(null);

    try {
      const updates: any = { name };
      if (password) {
        updates.password = password;
      }
      
      // Only allow email change if not superadmin (as per service rules)
      if (user.email !== 'enripw@gmail.com') {
        updates.email = email;
      }

      await userService.updateUser(user.id, updates, photoFile || undefined);
      await refreshUser();
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      setPassword('');
      setPhotoFile(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <LoadingSpinner message="Cargando perfil..." />;

  const isSuperAdmin = user.email === 'enripw@gmail.com';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 ${
                message.type === 'success' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-sm">
                  {photoPreview ? (
                    <ProgressiveImage 
                      src={photoPreview} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <UserIcon className="w-16 h-16 text-primary/30" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 bg-white rounded-full text-primary shadow-lg hover:scale-110 transition-transform"
                    title="Tomar foto"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-2 bg-white rounded-full text-blue-600 shadow-lg hover:scale-110 transition-transform"
                    title="Subir foto"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
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
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    disabled={isSuperAdmin}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                      isSuperAdmin ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''
                    }`}
                  />
                </div>
                {isSuperAdmin && (
                  <p className="mt-1 text-xs text-gray-400 italic">El correo del superadministrador no puede ser modificado.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva Contraseña (opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Dejar en blanco para mantener la actual"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

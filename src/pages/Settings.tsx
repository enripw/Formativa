import React, { useState, useEffect, useRef } from "react";
import { Save, Upload, Palette, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { settingsService } from "../services/settingsService";
import { AppSettings } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import { ProgressiveImage } from "../components/ProgressiveImage";

const DEFAULT_SETTINGS: AppSettings = {
  appName: "Liga Formativa",
  primaryColor: "#10b981", // Emerald 500
  secondaryColor: "#0f172a", // Slate 900
  accentColor: "#f59e0b", // Amber 500
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getSettings();
        if (data) {
          setSettings(data);
          if (data.logoUrl) setLogoPreview(data.logoUrl);
          if (data.credentialBgUrl) setBgPreview(data.credentialBgUrl);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Error al cargar la configuración.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBgFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await settingsService.updateSettings(settings, logoFile || undefined, bgFile || undefined);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(err.message || "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando configuración..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de la Aplicación</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2>Identidad y Estilo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre de la Aplicación</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Ej: Liga Formativa"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-none"
                  />
                  <span className="text-xs font-mono uppercase">{settings.primaryColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-none"
                  />
                  <span className="text-xs font-mono uppercase">{settings.secondaryColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-none"
                  />
                  <span className="text-xs font-mono uppercase">{settings.accentColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2>Logotipo de la App</h2>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <ProgressiveImage 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-w-full max-h-full object-contain" 
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Seleccionar Logo
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                className="hidden"
              />
              <p className="text-xs text-gray-500 text-center">
                Se recomienda formato PNG con transparencia.
              </p>
            </div>
          </div>

          {/* Credential Background Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2>Fondo de Credencial</h2>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 aspect-[5/9] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {bgPreview ? (
                  <ProgressiveImage 
                    src={bgPreview} 
                    alt="BG Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Seleccionar Fondo
              </button>
              <input
                type="file"
                ref={bgInputRef}
                onChange={handleBgChange}
                accept="image/*"
                className="hidden"
              />
              <p className="text-xs text-gray-500 text-center">
                Proporción recomendada: 5x9 (ej. 500x900 px, formato vertical).
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3 text-primary">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Configuración guardada correctamente.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
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
  );
}

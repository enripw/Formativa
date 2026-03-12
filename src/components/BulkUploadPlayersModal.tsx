import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { playerService } from '../services/playerService';
import { Player, Team } from '../types';

interface BulkUploadPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teams: Record<string, Team>;
  teamIdFilter?: string;
}

export default function BulkUploadPlayersModal({
  isOpen,
  onClose,
  onSuccess,
  teams,
  teamIdFilter
}: BulkUploadPlayersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecciona un archivo CSV válido.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Nombre', 'Apellido', 'DNI', 'Fecha Nacimiento (YYYY-MM-DD)', 'ID Equipo (Opcional)'];
    const csvContent = headers.join(',') + '\nJuan,Perez,12345678,2010-05-15,';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_jugadores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo primero.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            // Validate required fields
            const firstName = row['Nombre']?.trim();
            const lastName = row['Apellido']?.trim();
            const dni = row['DNI']?.toString().trim();
            const birthDate = row['Fecha Nacimiento (YYYY-MM-DD)']?.trim();
            let teamId = row['ID Equipo (Opcional)']?.trim();

            if (!firstName || !lastName || !dni || !birthDate) {
              throw new Error(`Faltan campos obligatorios en la fila ${i + 1}`);
            }

            // If a team filter is active (e.g., team admin), force that team
            if (teamIdFilter) {
              teamId = teamIdFilter;
            } else if (teamId && !teams[teamId]) {
              // If team ID is provided but invalid, we can either fail or set to empty. Let's fail.
              throw new Error(`ID de equipo inválido en la fila ${i + 1}`);
            }

            const newPlayer: Omit<Player, 'id'> = {
              firstName,
              lastName,
              dni,
              birthDate,
              teamId: teamId || '',
              photoUrl: '',
              createdAt: Date.now(),
            };

            await playerService.addPlayer(newPlayer);
            success++;
            setSuccessCount(success);
          } catch (err: any) {
            failed++;
            errors.push(`Fila ${i + 1}: ${err.message}`);
          }
        }

        setResults({ success, failed, errors });
        setIsUploading(false);
        if (success > 0) {
          onSuccess();
        }
      },
      error: (error) => {
        setError(`Error al leer el archivo: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">Carga Masiva de Jugadores</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!results ? (
          <div className="space-y-6">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Descarga la plantilla CSV.</li>
                  <li>Llena los datos sin modificar los encabezados.</li>
                  <li>El formato de fecha debe ser YYYY-MM-DD.</li>
                  <li>Sube el archivo completado.</li>
                </ul>
                <button 
                  onClick={downloadTemplate}
                  className="mt-3 text-blue-600 hover:text-blue-800 font-medium underline text-sm"
                >
                  Descargar plantilla CSV
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Archivo CSV</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  ref={fileInputRef}
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-primary" />
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-sm text-red-600 hover:text-red-700 mt-2"
                    >
                      Quitar archivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <p className="text-gray-600">
                      Arrastra tu archivo aquí o{' '}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary font-medium hover:underline"
                      >
                        explora
                      </button>
                    </p>
                    <p className="text-xs text-gray-500">Solo archivos .csv</p>
                  </div>
                )}
              </div>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando ({successCount}...)
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Jugadores
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Carga Completada</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 flex justify-around">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{results.success}</p>
                <p className="text-sm text-gray-600">Importados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-gray-600">Fallidos</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="text-left bg-red-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                <p className="font-medium text-red-800 mb-2 text-sm">Errores:</p>
                <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

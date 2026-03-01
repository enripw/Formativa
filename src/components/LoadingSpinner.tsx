import { Trophy } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ message = "Cargando...", fullPage = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full animate-pulse"></div>
        
        {/* Animated Soccer Ball */}
        <div className="relative animate-bounce">
          <div className="text-6xl flex items-center justify-center w-20 h-20 animate-[spin_3s_linear_infinite] drop-shadow-lg">
            ⚽️
          </div>
        </div>
        
        {/* Shadow */}
        <div className="w-12 h-2 bg-black/10 rounded-[100%] mx-auto mt-2 blur-[1px] animate-[pulse_1.5s_ease-in-out_infinite] scale-x-110"></div>
      </div>
      
      {message && (
        <p className="text-emerald-700 font-medium animate-pulse tracking-wide">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

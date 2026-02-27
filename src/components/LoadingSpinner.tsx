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
          <div className="animate-[spin_2s_linear_infinite] w-16 h-16 text-emerald-600">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-full h-full"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m6.7 6.7 1.3 1.3" />
              <path d="m17.3 6.7-1.3 1.3" />
              <path d="m17.3 17.3-1.3-1.3" />
              <path d="m6.7 17.3 1.3-1.3" />
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M12 12h.01" />
              <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
            </svg>
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

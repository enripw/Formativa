import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';

interface ProgressiveImageProps {
  src?: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  placeholderClassName = "" 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 text-zinc-400 ${className} ${placeholderClassName}`}>
        <User size={className.includes('h-full') ? 40 : 24} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading Placeholder */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-200 animate-pulse flex items-center justify-center"
          >
            <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

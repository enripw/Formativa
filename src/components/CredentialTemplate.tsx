import React, { forwardRef } from 'react';
import { Player } from '../types';
import { User } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

interface CredentialTemplateProps {
  player: Player;
}

const CredentialTemplate = forwardRef<HTMLDivElement, CredentialTemplateProps>(({ player }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[1000px] h-[630px] bg-emerald-900 relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Template Image */}
      <img 
        src="https://i.ibb.co/VphWH9ZW/1772327301790-2.jpg" 
        className="absolute inset-0 w-full h-full object-cover"
        alt="Template"
        crossOrigin="anonymous"
      />

      {/* Player Photo - Positioned in the circular frame of the image */}
      <div className="absolute top-[19.8%] left-[50.5%] -translate-x-1/2 w-[26.2%] aspect-square z-10">
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-gray-100 shadow-sm">
          {player.photoUrl ? (
            <img 
              src={player.photoUrl} 
              alt={player.firstName} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <User className="w-32 h-32" />
            </div>
          )}
        </div>
      </div>

      {/* Data Fields - Positioned over the white boxes in the template */}
      <div className="absolute top-[64.7%] left-[41.8%] w-[28.8%] h-[5.8%] flex items-center z-20">
        <span className="text-gray-900 font-bold text-2xl uppercase tracking-tight px-2">
          {player.firstName}
        </span>
      </div>

      <div className="absolute top-[72.0%] left-[41.8%] w-[28.8%] h-[5.8%] flex items-center z-20">
        <span className="text-gray-900 font-bold text-2xl uppercase tracking-tight px-2">
          {player.lastName}
        </span>
      </div>

      <div className="absolute top-[79.3%] left-[41.8%] w-[28.8%] h-[5.8%] flex items-center z-20">
        <span className="text-gray-900 font-bold text-2xl uppercase tracking-tight px-2">
          {player.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
        </span>
      </div>

      <div className="absolute top-[86.6%] left-[56.8%] w-[13.8%] h-[5.8%] flex items-center z-20">
        <span className="text-gray-900 font-bold text-xl uppercase tracking-tight px-2">
          {formatDate(player.birthDate)}
        </span>
      </div>
    </div>
  );
});

CredentialTemplate.displayName = 'CredentialTemplate';

export default CredentialTemplate;

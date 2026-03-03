import React, { forwardRef, useEffect, useState, useRef } from 'react';
import { Player } from '../types';
import { User } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';

interface CredentialTemplateProps {
  player: Player;
  onReady?: () => void;
}

const imageCache: Record<string, string> = {};

const getBase64ImageFromURL = async (url: string): Promise<string> => {
  if (!url) throw new Error('URL is empty');
  if (url.startsWith('data:image')) return url;
  if (imageCache[url]) return imageCache[url];

  try {
    // Try direct fetch first
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    imageCache[url] = base64;
    return base64;
  } catch (directError) {
    console.warn('Direct fetch failed, trying proxies...', directError);
    
    const encodedUrl = encodeURIComponent(url);
    const proxies = [
      { url: `https://api.allorigins.win/raw?url=${encodedUrl}`, type: 'blob' },
      { url: `https://api.allorigins.win/get?url=${encodedUrl}`, type: 'json' },
      { url: `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`, type: 'blob' },
      { url: `https://corsproxy.io/?${encodedUrl}`, type: 'blob' },
      { url: `https://thingproxy.freeboard.io/fetch/${encodedUrl}`, type: 'blob' },
      { url: `https://yacdn.org/proxy/${url}`, type: 'blob' }
    ];

    for (const proxy of proxies) {
      try {
        const response = await fetch(proxy.url);
        if (!response.ok) continue;
        
        if (proxy.type === 'json') {
          const data = await response.json();
          if (data.contents && data.contents.startsWith('data:image')) {
            imageCache[url] = data.contents;
            return data.contents;
          }
        } else {
          const blob = await response.blob();
          // Reject if it's obviously an HTML error page
          if (blob.type.includes('text/html')) {
            continue;
          }

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          imageCache[url] = base64;
          return base64;
        }
      } catch (proxyError) {
        // Ignore proxy errors and try the next one
      }
    }
    
    console.error('All proxies failed for URL:', url);
    // Return a transparent 1x1 pixel to prevent html2canvas from crashing
    const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    imageCache[url] = fallback;
    return fallback;
  }
};

const CredentialTemplate = forwardRef<HTMLDivElement, CredentialTemplateProps>(({ player, onReady }, ref) => {
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [photoBase64, setPhotoBase64] = useState<string>("");

  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      const bgPromise = getBase64ImageFromURL("https://firebasestorage.googleapis.com/v0/b/ligaformativa-3db31.firebasestorage.app/o/players%2Fcredencial.jpg?alt=media")
        .catch((e) => {
          console.error("Error loading template background", e);
          return "";
        });

      const photoPromise = player.photoUrl
        ? getBase64ImageFromURL(player.photoUrl).catch((e) => {
            console.error("Error loading player photo", e);
            return "";
          })
        : Promise.resolve("");

      const [bg, photo] = await Promise.all([bgPromise, photoPromise]);

      if (!isMounted) return;

      if (bg) setTemplateBase64(bg);
      setPhotoBase64(photo || "");

      // Small delay to ensure React has painted the base64 images
      setTimeout(() => {
        if (isMounted && onReadyRef.current) {
          onReadyRef.current();
        }
      }, 1000);
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [player.photoUrl]);

  return (
    <div 
      ref={ref}
      className="w-[1000px] h-[630px] bg-emerald-900 relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background Template Image */}
      {templateBase64 ? (
        <img 
          src={templateBase64} 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Template"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-emerald-800" />
      )}

      {/* Player Photo - Positioned in the circular frame of the image */}
      <div className="absolute top-[19.8%] left-[50.5%] -translate-x-1/2 w-[26.2%] aspect-square z-10">
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-gray-100 shadow-sm">
          {photoBase64 ? (
            <img 
              src={photoBase64} 
              alt={player.firstName} 
              className="w-full h-full object-cover"
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

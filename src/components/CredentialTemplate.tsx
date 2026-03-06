import React, { forwardRef, useEffect, useState, useRef } from 'react';
import { Player } from '../types';
import { User } from 'lucide-react';
import { formatDate } from '../lib/dateUtils';
import { useSettings } from '../contexts/SettingsContext';

interface CredentialTemplateProps {
  player: Player;
  onReady?: () => void;
}

const imageCache: Record<string, string> = {};
const CACHE_BUSTER = Date.now();

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
  const { settings } = useSettings();
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [dimensions, setDimensions] = useState({ width: 1011, height: 638 });

  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let isMounted = true;

    const loadImages = async () => {
      const bgUrl = settings.credentialBgUrl || `https://firebasestorage.googleapis.com/v0/b/ligaformativa-3db31.firebasestorage.app/o/players%2Fcredencial.jpg?alt=media&v=${CACHE_BUSTER}`;
      
      const bgPromise = getBase64ImageFromURL(bgUrl)
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

      if (bg) {
        setTemplateBase64(bg);
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            if (img.width && img.height) {
              // Standard CR-80 width in pixels at ~300dpi is around 1011px
              // We fix the width to ensure font sizes (rem/px) remain consistent relative to the card
              const TARGET_WIDTH = 1011;
              const aspectRatio = img.width / img.height;
              setDimensions({ 
                width: TARGET_WIDTH, 
                height: TARGET_WIDTH / aspectRatio 
              });
            }
            
            // Trigger ready after dimensions are set and a small render delay
            setTimeout(() => {
              if (isMounted && onReadyRef.current) {
                onReadyRef.current();
              }
            }, 500);
          }
        };
        img.onerror = () => {
          console.error("Error loading background image for dimensions");
          // Fallback trigger
          setTimeout(() => {
            if (isMounted && onReadyRef.current) {
              onReadyRef.current();
            }
          }, 500);
        };
        img.src = bg;
      } else {
        // Small delay to ensure React has painted
        setTimeout(() => {
          if (isMounted && onReadyRef.current) {
            onReadyRef.current();
          }
        }, 1000);
      }
      
      setPhotoBase64(photo || "");
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [player.photoUrl, settings.credentialBgUrl]);

  return (
    <div 
      ref={ref}
      className="bg-primary relative overflow-hidden"
      style={{ 
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        fontFamily: "'Gadugi', sans-serif" 
      }}
    >
      {/* Background Template Image */}
      {templateBase64 ? (
        <img 
          src={templateBase64} 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Template"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-primary" />
      )}

      {/* Player Photo - Positioned in the circular frame of the image */}
      <div className="absolute top-[8.4%] left-[50%] -translate-x-1/2 w-[45.6%] aspect-square z-10">
        <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-white bg-gray-100 shadow-md">
          {photoBase64 ? (
            <img 
              src={photoBase64} 
              alt={player.firstName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <User className="w-1/2 h-1/2" />
            </div>
          )}
        </div>
      </div>

      {/* First Name */}
      <div className="absolute top-[35.1%] left-0 w-full flex justify-center z-20">
        <span 
          className="font-bold uppercase tracking-tight"
          style={{ color: '#C9AF42', fontSize: `${dimensions.width * 0.075}px`, lineHeight: 1 }}
        >
          {player.firstName}
        </span>
      </div>

      {/* Last Name */}
      <div className="absolute top-[40.0%] left-0 w-full flex justify-center z-20">
        <span 
          className="font-bold uppercase tracking-tight"
          style={{ color: '#244423', fontSize: `${dimensions.width * 0.08}px`, lineHeight: 1 }}
        >
          {player.lastName}
        </span>
      </div>

      {/* DNI */}
      <div className="absolute top-[49.4%] left-0 w-full flex justify-center z-20">
        <span 
          className="font-bold uppercase tracking-tight"
          style={{ color: '#244423', fontSize: `${dimensions.width * 0.065}px`, lineHeight: 1 }}
        >
          {player.dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
        </span>
      </div>

      {/* Date of Birth */}
      <div className="absolute top-[53.8%] left-0 w-full flex justify-center z-20">
        <span 
          className="font-bold uppercase tracking-tight"
          style={{ color: '#244423', fontSize: `${dimensions.width * 0.065}px`, lineHeight: 1 }}
        >
          {formatDate(player.birthDate)}
        </span>
      </div>
    </div>
  );
});

CredentialTemplate.displayName = 'CredentialTemplate';

export default CredentialTemplate;

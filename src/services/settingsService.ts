import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { AppSettings } from "../types";

const SETTINGS_DOC_ID = "global";
const SETTINGS_COLLECTION = "settings";

export const settingsService = {
  getSettings: async (): Promise<AppSettings | null> => {
    if (!db) return null;
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AppSettings;
    }
    return null;
  },

  subscribeToSettings: (callback: (settings: AppSettings | null) => void) => {
    if (!db) return () => {};
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as AppSettings);
      } else {
        callback(null);
      }
    });
  },

  updateSettings: async (settings: Partial<AppSettings>, logoFile?: File, bgFile?: File): Promise<void> => {
    if (!db) return;

    let logoUrl = settings.logoUrl;
    let credentialBgUrl = settings.credentialBgUrl;

    if (logoFile && storage) {
      const logoRef = ref(storage, `settings/logo_${Date.now()}`);
      const processedLogo = await settingsService.processImage(logoFile);
      const snapshot = await uploadBytes(logoRef, processedLogo);
      logoUrl = await getDownloadURL(snapshot.ref);
    }

    if (bgFile && storage) {
      const bgRef = ref(storage, `settings/credential_bg_${Date.now()}`);
      const processedBg = await settingsService.processImage(bgFile);
      const snapshot = await uploadBytes(bgRef, processedBg);
      credentialBgUrl = await getDownloadURL(snapshot.ref);
    }

    const updateData: any = {
      ...settings,
      updatedAt: Date.now(),
    };

    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (credentialBgUrl !== undefined) updateData.credentialBgUrl = credentialBgUrl;

    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, updateData, { merge: true });
  },

  processImage: async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Mantener transparencia para PNG/WebP
          const isTransparent = file.type === 'image/png' || file.type === 'image/webp';
          const outputType = isTransparent ? file.type : 'image/jpeg';

          // Redimensionar si es muy grande (max 1200px)
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          // Limpiar canvas para transparencia
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name, {
                  type: outputType,
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file);
              }
            },
            outputType,
            outputType === 'image/jpeg' ? 0.8 : undefined
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  },
};

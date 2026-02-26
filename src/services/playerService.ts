import { db, isConfigured } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { Player } from "../types";

const COLLECTION_NAME = "players";

export const playerService = {
  async getPlayers(): Promise<Player[]> {
    if (!isConfigured) return [];
    
    const q = query(collection(db!, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Player[];
  },

  async getPlayer(id: string): Promise<Player | null> {
    if (!isConfigured) return null;

    const docRef = doc(db!, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Player;
    }
    return null;
  },

  async addPlayer(player: Omit<Player, "id">, photoFile?: File): Promise<string> {
    if (!isConfigured) throw new Error("Firebase no está configurado");

    console.log("Iniciando guardado de nuevo jugador...");
    let photoUrl = "";
    if (photoFile) {
      console.log("Subiendo foto a Storage...");
      photoUrl = await this.uploadPhoto(photoFile);
      console.log("Foto subida con éxito. URL:", photoUrl);
    }

    console.log("Guardando datos en Firestore Database...");
    try {
      const docRef = await addDoc(collection(db!, COLLECTION_NAME), {
        ...player,
        photoUrl,
        createdAt: Date.now(),
      });
      console.log("Jugador guardado con éxito. ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      throw error;
    }
  },

  async updatePlayer(id: string, player: Partial<Player>, photoFile?: File): Promise<void> {
    if (!isConfigured) throw new Error("Firebase no está configurado");

    console.log(`Actualizando jugador ${id}...`);
    const updateData = { ...player };
    if (photoFile) {
      console.log("Subiendo nueva foto a Storage...");
      updateData.photoUrl = await this.uploadPhoto(photoFile);
      console.log("Nueva foto subida con éxito.");
    }

    console.log("Actualizando datos en Firestore Database...");
    try {
      const docRef = doc(db!, COLLECTION_NAME, id);
      await updateDoc(docRef, updateData);
      console.log("Jugador actualizado con éxito.");
    } catch (error) {
      console.error("Error al actualizar en Firestore:", error);
      throw error;
    }
  },

  async deletePlayer(id: string): Promise<void> {
    if (!isConfigured) throw new Error("Firebase no está configurado");

    const docRef = doc(db!, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  async uploadPhoto(file: File): Promise<string> {
    const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!imgbbKey) {
      throw new Error("Falta configurar la API Key de ImgBB. Revisa las variables de entorno.");
    }

    try {
      // 1. Comprimir la imagen antes de subirla
      const compressedFile = await this.compressImage(file);
      
      // 2. Convertir a Base64 (ImgBB lo procesa mucho mejor desde el navegador)
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          const result = reader.result as string;
          // ImgBB espera solo la cadena base64, sin el prefijo "data:image/jpeg;base64,"
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      console.log("Enviando imagen a ImgBB...");
      
      // 3. Preparar el FormData
      const formData = new FormData();
      formData.append("image", base64Image);
      
      // 4. Enviar a la API de ImgBB
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Imagen subida con éxito a ImgBB:", data.data.url);
        return data.data.url;
      } else {
        throw new Error(data.error?.message || "Error desconocido en ImgBB");
      }
    } catch (error: any) {
      console.error("Error detallado al subir la foto a ImgBB:", error);
      throw new Error(`Error al subir la foto: ${error.message || 'Desconocido'}`);
    }
  },

  // Función auxiliar para comprimir imágenes en el cliente
  compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file); // Si falla la compresión, devolver el original
              }
            },
            'image/jpeg',
            0.7 // Calidad de compresión (70%)
          );
        };
        img.onerror = () => resolve(file); // Si falla la carga, devolver el original
      };
      reader.onerror = () => resolve(file); // Si falla la lectura, devolver el original
    });
  },
};

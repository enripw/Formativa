import { db, storage, isConfigured } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  getCountFromServer,
  limit,
  startAfter,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Player } from "../types";

const COLLECTION_NAME = "players";

export const playerService = {
  async getPlayers(teamId?: string): Promise<Player[]> {
    if (!isConfigured) return [];
    
    try {
      let q;
      if (teamId) {
        // Remove orderBy from query to avoid composite index requirement
        q = query(
          collection(db!, COLLECTION_NAME), 
          where("teamId", "==", teamId)
        );
      } else {
        q = query(collection(db!, COLLECTION_NAME), orderBy("createdAt", "desc"));
      }
      
      const snapshot = await getDocs(q);
      let players = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      })) as Player[];

      // Sort in memory if we filtered by teamId
      if (teamId) {
        players.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }

      return players;
    } catch (error: any) {
      console.error("Error fetching players:", error);
      // If it's an index error, provide a helpful message even if we tried to avoid it
      if (error.message?.includes("requires an index")) {
        console.warn("Firestore index required. Please create it using the link in the console.");
      }
      throw error;
    }
  },

  async getPlayersPaginated(
    teamId?: string, 
    pageSize: number = 20, 
    lastDoc?: QueryDocumentSnapshot | null
  ): Promise<{ players: Player[], lastDoc: QueryDocumentSnapshot | null, hasMore: boolean }> {
    if (!isConfigured) return { players: [], lastDoc: null, hasMore: false };
    
    try {
      let constraints: any[] = [];
      
      if (teamId) {
        constraints.push(where("teamId", "==", teamId));
        // Note: Without orderBy("createdAt", "desc"), startAfter will use the document ID order.
        // To avoid requiring a composite index for every team, we paginate by ID or default order.
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }
      
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      constraints.push(limit(pageSize));
      
      const q = query(collection(db!, COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);
      
      let players = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      })) as Player[];

      // Sort in memory if we filtered by teamId (only sorts the current page)
      if (teamId) {
        players.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }

      const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      const hasMore = snapshot.docs.length === pageSize;

      return { players, lastDoc: newLastDoc, hasMore };
    } catch (error: any) {
      console.error("Error fetching paginated players:", error);
      throw error;
    }
  },

  async countPlayers(teamId?: string): Promise<number> {
    if (!isConfigured) return 0;
    try {
      let q;
      if (teamId) {
        q = query(collection(db!, COLLECTION_NAME), where("teamId", "==", teamId));
      } else {
        q = collection(db!, COLLECTION_NAME);
      }
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error("Error counting players:", error);
      return 0;
    }
  },

  async countRecentPlayers(teamId?: string, days: number = 7): Promise<number> {
    if (!isConfigured) return 0;
    try {
      const timestamp = Date.now() - days * 24 * 60 * 60 * 1000;
      let q;
      if (teamId) {
        q = query(
          collection(db!, COLLECTION_NAME), 
          where("teamId", "==", teamId),
          where("createdAt", ">", timestamp)
        );
      } else {
        q = query(
          collection(db!, COLLECTION_NAME), 
          where("createdAt", ">", timestamp)
        );
      }
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error("Error counting recent players:", error);
      // Fallback if composite index is missing
      if (teamId) {
        try {
          const allTeamPlayers = await this.getPlayers(teamId);
          return allTeamPlayers.filter(p => p.createdAt && p.createdAt > Date.now() - days * 24 * 60 * 60 * 1000).length;
        } catch (e) {
          return 0;
        }
      }
      return 0;
    }
  },

  async getRecentPlayers(teamId?: string, maxCount: number = 5): Promise<Player[]> {
    if (!isConfigured) return [];
    try {
      let q;
      if (teamId) {
        // Without composite index, we have to fetch all for the team and sort in memory
        q = query(
          collection(db!, COLLECTION_NAME), 
          where("teamId", "==", teamId)
        );
        const snapshot = await getDocs(q);
        let players = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as Player[];
        players.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return players.slice(0, maxCount);
      } else {
        q = query(
          collection(db!, COLLECTION_NAME), 
          orderBy("createdAt", "desc"),
          limit(maxCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as Player[];
      }
    } catch (error) {
      console.error("Error fetching recent players:", error);
      return [];
    }
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

  async checkDniExists(dni: string): Promise<Player | null> {
    if (!isConfigured) return null;
    const q = query(collection(db!, COLLECTION_NAME), where("dni", "==", dni));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Player;
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
      // 1. Intentar borrar la foto anterior si existe
      try {
        const oldPlayer = await this.getPlayer(id);
        if (oldPlayer?.photoUrl && oldPlayer.photoUrl.includes('firebasestorage.googleapis.com')) {
          const oldPhotoRef = ref(storage!, oldPlayer.photoUrl);
          await deleteObject(oldPhotoRef);
          console.log("Foto anterior eliminada de Storage con éxito");
        }
      } catch (error) {
        console.warn("No se pudo eliminar la foto anterior de Storage:", error);
      }

      // 2. Subir la nueva foto
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

    try {
      // 1. Obtener los datos del jugador para ver si tiene foto
      const player = await this.getPlayer(id);
      
      // 2. Si tiene foto y es de Firebase Storage, eliminarla
      if (player?.photoUrl && player.photoUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const photoRef = ref(storage!, player.photoUrl);
          await deleteObject(photoRef);
          console.log("Foto del jugador eliminada de Storage con éxito");
        } catch (error) {
          console.error("Error al eliminar la foto de Storage:", error);
          // No bloqueamos el borrado del jugador si falla el borrado de la foto
        }
      }

      // 3. Eliminar el documento de Firestore
      const docRef = doc(db!, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      console.log("Jugador eliminado de Firestore con éxito");
    } catch (error) {
      console.error("Error al eliminar el jugador:", error);
      throw error;
    }
  },

  async uploadPhoto(file: File): Promise<string> {
    if (!isConfigured || !storage) {
      throw new Error("Firebase Storage no está configurado");
    }

    try {
      // 1. Comprimir la imagen antes de subirla
      const compressedFile = await this.compressImage(file);
      
      console.log("Enviando imagen a Firebase Storage...");
      
      // 2. Generar un nombre de archivo único
      const uniqueFilename = `players/${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // 3. Subir a Firebase Storage con metadatos de caché
      const storageRef = ref(storage, uniqueFilename);
      const metadata = {
        cacheControl: 'public,max-age=31536000', // 1 año de caché
        contentType: compressedFile.type
      };
      
      await uploadBytes(storageRef, compressedFile, metadata);
      
      // 4. Obtener la URL de descarga
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log("Imagen subida con éxito a Firebase Storage:", downloadURL);
      return downloadURL;
    } catch (error: any) {
      console.error("Error detallado al subir la foto a Firebase Storage:", error);
      throw new Error(`Error al subir la foto: ${error.message || 'Desconocido'}`);
    }
  },

  // Función auxiliar para comprimir imágenes en el cliente
  compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Reducido para mayor agilidad
          const MAX_HEIGHT = 800; // Reducido para mayor agilidad
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
          
          // Limpiar el canvas con transparencia si es necesario
          ctx?.clearRect(0, 0, width, height);
          ctx?.drawImage(img, 0, 0, width, height);

          // Determinar el formato de salida para preservar transparencia si es PNG/WebP
          const outputType = (file.type === 'image/png' || file.type === 'image/webp') 
            ? file.type 
            : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name, {
                  type: outputType,
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file); // Si falla la compresión, devolver el original
              }
            },
            outputType,
            outputType === 'image/jpeg' ? 0.75 : undefined
          );
        };
        img.onerror = () => resolve(file); // Si falla la carga, devolver el original
      };
      reader.onerror = () => resolve(file); // Si falla la lectura, devolver el original
    });
  },
};

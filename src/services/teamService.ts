import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  getCountFromServer,
  limit,
  startAfter
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, isConfigured } from "../lib/firebase";
import { Team } from "../types";

const COLLECTION_NAME = "teams";

const normalizeString = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

export const teamService = {
  countTeams: async (): Promise<number> => {
    if (!db) {
      const data = localStorage.getItem("liga_formativa_teams");
      return data ? JSON.parse(data).length : 0;
    }
    try {
      const snapshot = await getCountFromServer(collection(db, COLLECTION_NAME));
      return snapshot.data().count;
    } catch (error) {
      console.error("Error counting teams:", error);
      return 0;
    }
  },

  getTeams: async (): Promise<Team[]> => {
    if (!db) {
      const data = localStorage.getItem("liga_formativa_teams");
      return data ? JSON.parse(data) : [];
    }

    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw error;
    }
  },

  getTeamsPaginated: async (pageSize: number = 20, lastDoc?: any): Promise<{ teams: Team[], lastDoc: any, hasMore: boolean }> => {
    if (!db) {
      const data = localStorage.getItem("liga_formativa_teams");
      const allTeams = data ? JSON.parse(data) : [];
      return { teams: allTeams, lastDoc: null, hasMore: false };
    }

    try {
      let constraints: any[] = [orderBy("createdAt", "desc")];
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(pageSize));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);
      
      const teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];

      const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      const hasMore = snapshot.docs.length === pageSize;

      return { teams, lastDoc: newLastDoc, hasMore };
    } catch (error) {
      console.error("Error fetching paginated teams:", error);
      throw error;
    }
  },

  getTeamById: async (id: string): Promise<Team | null> => {
    if (!db) {
      const teams = await teamService.getTeams();
      return teams.find((t) => t.id === id) || null;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Team;
      }
      return null;
    } catch (error) {
      console.error("Error fetching team:", error);
      throw error;
    }
  },

  createTeam: async (team: Omit<Team, "id" | "createdAt">, logoFile?: File): Promise<Team> => {
    const teams = await teamService.getTeams();
    const normalizedNewName = normalizeString(team.name);
    
    if (teams.some(t => normalizeString(t.name) === normalizedNewName)) {
      throw new Error("Ya existe un equipo con este nombre");
    }

    let logoUrl = "";
    if (logoFile && isConfigured && storage) {
      logoUrl = await teamService.uploadLogo(logoFile);
    }

    const newTeamData = {
      ...team,
      logoUrl,
      createdAt: Date.now(),
    };

    if (!db) {
      const teams = await teamService.getTeams();
      const newTeam = { ...newTeamData, id: crypto.randomUUID() };
      teams.push(newTeam);
      localStorage.setItem("liga_formativa_teams", JSON.stringify(teams));
      return newTeam;
    }

    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTeamData);
      return { id: docRef.id, ...newTeamData } as Team;
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  },

  updateTeam: async (id: string, updates: Partial<Team>, logoFile?: File): Promise<Team> => {
    if (updates.name) {
      const teams = await teamService.getTeams();
      const normalizedNewName = normalizeString(updates.name);
      
      if (teams.some(t => t.id !== id && normalizeString(t.name) === normalizedNewName)) {
        throw new Error("Ya existe otro equipo con este nombre");
      }
    }

    const finalUpdates = { ...updates };

    if (logoFile && isConfigured && storage) {
      // 1. Intentar borrar el logo anterior si existe
      try {
        const oldTeam = await teamService.getTeamById(id);
        if (oldTeam?.logoUrl && oldTeam.logoUrl.includes('firebasestorage.googleapis.com')) {
          const oldPhotoRef = ref(storage, oldTeam.logoUrl);
          await deleteObject(oldPhotoRef);
        }
      } catch (error) {
        console.warn("No se pudo eliminar el logo anterior de Storage:", error);
      }

      // 2. Subir el nuevo logo
      finalUpdates.logoUrl = await teamService.uploadLogo(logoFile);
    }

    if (!db) {
      const teams = await teamService.getTeams();
      const index = teams.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Equipo no encontrado");
      const updatedTeam = { ...teams[index], ...finalUpdates };
      teams[index] = updatedTeam;
      localStorage.setItem("liga_formativa_teams", JSON.stringify(teams));
      return updatedTeam;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, finalUpdates);
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as Team;
    } catch (error) {
      console.error("Error updating team:", error);
      throw error;
    }
  },

  deleteTeam: async (id: string): Promise<void> => {
    if (!db) {
      const teams = await teamService.getTeams();
      const filteredTeams = teams.filter((t) => t.id !== id);
      localStorage.setItem("liga_formativa_teams", JSON.stringify(filteredTeams));
      return;
    }

    try {
      // 1. Obtener los datos del equipo para ver si tiene logo
      const team = await teamService.getTeamById(id);
      
      // 2. Si tiene logo y es de Firebase Storage, eliminarlo
      if (team?.logoUrl && team.logoUrl.includes('firebasestorage.googleapis.com') && storage) {
        try {
          const logoRef = ref(storage, team.logoUrl);
          await deleteObject(logoRef);
        } catch (error) {
          console.error("Error al eliminar el logo de Storage:", error);
        }
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting team:", error);
      throw error;
    }
  },

  uploadLogo: async (file: File): Promise<string> => {
    if (!isConfigured || !storage) {
      throw new Error("Firebase Storage no está configurado");
    }

    try {
      const compressedFile = await teamService.compressImage(file);
      const uniqueFilename = `teams/${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, uniqueFilename);
      const metadata = {
        cacheControl: 'public,max-age=31536000',
        contentType: compressedFile.type
      };
      
      await uploadBytes(storageRef, compressedFile, metadata);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error("Error al subir el logo:", error);
      throw new Error(`Error al subir el logo: ${error.message || 'Desconocido'}`);
    }
  },

  compressImage: (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
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

          // Determinar el formato de salida. 
          // Si es PNG o WebP, mantenemos el formato para preservar transparencia.
          // De lo contrario, usamos JPEG para mejor compresión.
          const outputType = (file.type === 'image/png' || file.type === 'image/webp') 
            ? file.type 
            : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, {
                  type: outputType,
                  lastModified: Date.now(),
                }));
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
      reader.onloadend = () => {
        if (reader.error) resolve(file);
      };
    });
  },
};

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Team } from "../types";

const COLLECTION_NAME = "teams";

export const teamService = {
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

  createTeam: async (team: Omit<Team, "id" | "createdAt">): Promise<Team> => {
    const newTeamData = {
      ...team,
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

  updateTeam: async (id: string, updates: Partial<Team>): Promise<Team> => {
    if (!db) {
      const teams = await teamService.getTeams();
      const index = teams.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Equipo no encontrado");
      const updatedTeam = { ...teams[index], ...updates };
      teams[index] = updatedTeam;
      localStorage.setItem("liga_formativa_teams", JSON.stringify(teams));
      return updatedTeam;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updates);
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
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting team:", error);
      throw error;
    }
  },
};

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Tournament, 
  TournamentCategory, 
  Group, 
  League, 
  Match 
} from "../types/tournament";

export const tournamentService = {
  // Tournaments
  async getTournaments(): Promise<Tournament[]> {
    const q = query(collection(db, "tournaments"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
  },

  async getTournament(id: string): Promise<Tournament | null> {
    const docRef = doc(db, "tournaments", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Tournament : null;
  },

  async createTournament(tournament: Omit<Tournament, "id">): Promise<string> {
    const docRef = doc(collection(db, "tournaments"));
    await setDoc(docRef, { ...tournament, createdAt: Date.now() });
    return docRef.id;
  },

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<void> {
    const docRef = doc(db, "tournaments", id);
    await updateDoc(docRef, updates);
  },

  async deleteTournament(id: string): Promise<void> {
    // 1. Get all related collections
    const categoriesQuery = query(collection(db, "tournament_categories"), where("tournamentId", "==", id));
    const groupsQuery = query(collection(db, "tournament_groups"), where("tournamentId", "==", id));
    const leaguesQuery = query(collection(db, "tournament_leagues"), where("tournamentId", "==", id));
    const matchesQuery = query(collection(db, "tournament_matches"), where("tournamentId", "==", id));

    const [categoriesSnap, groupsSnap, leaguesSnap, matchesSnap] = await Promise.all([
      getDocs(categoriesQuery),
      getDocs(groupsQuery),
      getDocs(leaguesQuery),
      getDocs(matchesQuery)
    ]);

    // 2. Prepare all deletions
    const allDeletions = [
      ...categoriesSnap.docs.map(d => d.ref),
      ...groupsSnap.docs.map(d => d.ref),
      ...leaguesSnap.docs.map(d => d.ref),
      ...matchesSnap.docs.map(d => d.ref),
      doc(db, "tournaments", id)
    ];

    // 3. Execute in batches of 500
    const chunkSize = 500;
    for (let i = 0; i < allDeletions.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = allDeletions.slice(i, i + chunkSize);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  },

  // Categories
  async getCategories(tournamentId: string): Promise<TournamentCategory[]> {
    const q = query(collection(db, "tournament_categories"), where("tournamentId", "==", tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentCategory));
  },

  async saveCategories(categories: TournamentCategory[]): Promise<void> {
    const batch = writeBatch(db);
    categories.forEach(cat => {
      const docRef = doc(db, "tournament_categories", cat.id!);
      batch.set(docRef, cat);
    });
    await batch.commit();
  },

  // Groups
  async getGroups(categoryId: string): Promise<Group[]> {
    const q = query(collection(db, "tournament_groups"), where("categoryId", "==", categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
  },

  async saveGroups(groups: Group[]): Promise<void> {
    const batch = writeBatch(db);
    groups.forEach(group => {
      const docRef = doc(db, "tournament_groups", group.id!);
      batch.set(docRef, group);
    });
    await batch.commit();
  },

  // Leagues
  async getLeagues(categoryId: string): Promise<League[]> {
    const q = query(collection(db, "tournament_leagues"), where("categoryId", "==", categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League));
  },

  async saveLeagues(leagues: League[]): Promise<void> {
    const batch = writeBatch(db);
    leagues.forEach(league => {
      const docRef = doc(db, "tournament_leagues", league.id!);
      batch.set(docRef, league);
    });
    await batch.commit();
  },

  // Matches
  async getMatches(categoryId: string): Promise<Match[]> {
    const q = query(collection(db, "tournament_matches"), where("categoryId", "==", categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
  },

  async saveMatches(matches: Match[]): Promise<void> {
    const batch = writeBatch(db);
    // Firestore batch limit is 500 operations
    // If we have more than 500 matches, we need to chunk them
    const chunks = [];
    for (let i = 0; i < matches.length; i += 500) {
      chunks.push(matches.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const chunkBatch = writeBatch(db);
      chunk.forEach(match => {
        const docRef = doc(db, "tournament_matches", match.id!);
        chunkBatch.set(docRef, match);
      });
      await chunkBatch.commit();
    }
  },

  async updateMatch(id: string, updates: Partial<Match>): Promise<void> {
    const docRef = doc(db, "tournament_matches", id);
    await updateDoc(docRef, updates);
  }
};

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "../types";

const COLLECTION_NAME = "users";

const SUPERADMIN_EMAIL = "enripw@gmail.com";

const defaultUser: User = {
  id: "admin-1",
  email: SUPERADMIN_EMAIL,
  password: "admin",
  name: "Administrador Principal",
  role: "admin",
  createdAt: Date.now(),
};

export const userService = {
  getUsers: async (): Promise<User[]> => {
    if (!db) {
      // Fallback to local storage if Firebase is not configured
      const data = localStorage.getItem("liga_formativa_users");
      if (!data) {
        localStorage.setItem("liga_formativa_users", JSON.stringify([defaultUser]));
        return [defaultUser];
      }
      return JSON.parse(data);
    }

    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Ensure superadmin exists in the returned list and DB
      const superAdmin = users.find(u => u.email === SUPERADMIN_EMAIL);
      if (!superAdmin) {
        try {
          const { id, ...superAdminData } = defaultUser;
          const docRef = await addDoc(collection(db, COLLECTION_NAME), superAdminData);
          const newSuperAdmin = { ...defaultUser, id: docRef.id };
          users.push(newSuperAdmin);
        } catch (e) {
          console.error("Failed to create default superadmin in DB", e);
          users.push(defaultUser);
        }
      } else {
        // Ensure the superadmin always has the admin role
        if (superAdmin.role !== 'admin') {
          superAdmin.role = 'admin';
          updateDoc(doc(db, COLLECTION_NAME, superAdmin.id!), { role: 'admin' }).catch(console.error);
        }
      }

      return users;
    } catch (error) {
      console.error("Error fetching users from Firebase:", error);
      throw error;
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    if (!db) {
      const users = await userService.getUsers();
      return users.find((u) => u.id === id) || null;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  },

  createUser: async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
    if (!db) {
      const users = await userService.getUsers();
      if (users.some(u => u.email === user.email)) {
        throw new Error("El correo electrónico ya está registrado");
      }
      const newUser: User = {
        ...user,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      users.push(newUser);
      localStorage.setItem("liga_formativa_users", JSON.stringify(users));
      return newUser;
    }

    try {
      // Check if email already exists
      const q = query(collection(db, COLLECTION_NAME), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty || user.email === SUPERADMIN_EMAIL) {
        throw new Error("El correo electrónico ya está registrado");
      }

      const newUser = {
        ...user,
        createdAt: Date.now(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newUser);
      return { id: docRef.id, ...newUser } as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    if (!db) {
      const users = await userService.getUsers();
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) throw new Error("Usuario no encontrado");
      
      const userToUpdate = users[index];
      if (userToUpdate.email === SUPERADMIN_EMAIL) {
        if (updates.email && updates.email !== SUPERADMIN_EMAIL) {
          throw new Error("No se puede cambiar el correo del superadministrador");
        }
        if (updates.role && updates.role !== 'admin') {
          throw new Error("No se puede cambiar el rol del superadministrador");
        }
      }

      if (updates.email && updates.email !== userToUpdate.email) {
        if (users.some(u => u.email === updates.email)) {
          throw new Error("El correo electrónico ya está registrado");
        }
      }

      const updatedUser = { ...userToUpdate, ...updates };
      users[index] = updatedUser;
      localStorage.setItem("liga_formativa_users", JSON.stringify(users));
      return updatedUser;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Usuario no encontrado");
      }
      
      const userToUpdate = docSnap.data() as User;
      
      if (userToUpdate.email === SUPERADMIN_EMAIL) {
        if (updates.email && updates.email !== SUPERADMIN_EMAIL) {
          throw new Error("No se puede cambiar el correo del superadministrador");
        }
        if (updates.role && updates.role !== 'admin') {
          throw new Error("No se puede cambiar el rol del superadministrador");
        }
      }

      if (updates.email && updates.email !== userToUpdate.email) {
        const q = query(collection(db, COLLECTION_NAME), where("email", "==", updates.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
          throw new Error("El correo electrónico ya está registrado");
        }
      }

      await updateDoc(docRef, updates);
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as User;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (!db) {
      const users = await userService.getUsers();
      if (users.length <= 1) {
        throw new Error("No puedes eliminar el último usuario del sistema");
      }
      const userToDelete = users.find(u => u.id === id);
      if (userToDelete?.email === SUPERADMIN_EMAIL) {
        throw new Error("No se puede eliminar el superadministrador principal");
      }
      const filteredUsers = users.filter((u) => u.id !== id);
      localStorage.setItem("liga_formativa_users", JSON.stringify(filteredUsers));
      return;
    }

    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userToDelete = docSnap.data() as User;
        if (userToDelete.email === SUPERADMIN_EMAIL) {
          throw new Error("No se puede eliminar el superadministrador principal");
        }
      }
      
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
};

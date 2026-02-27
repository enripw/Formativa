import { User } from "../types";

const STORAGE_KEY = "liga_formativa_users";

const defaultUser: User = {
  id: "admin-1",
  email: "enripw@gmail.com",
  password: "admin",
  name: "Administrador",
  createdAt: Date.now(),
};

export const userService = {
  getUsers: async (): Promise<User[]> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultUser]));
      return [defaultUser];
    }
    return JSON.parse(data);
  },

  getUserById: async (id: string): Promise<User | null> => {
    const users = await userService.getUsers();
    return users.find((u) => u.id === id) || null;
  },

  createUser: async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = await userService.getUsers();
    
    // Check if email already exists
    if (users.some(u => u.email === user.email)) {
      throw new Error("El correo electrónico ya está registrado");
    }

    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = await userService.getUsers();
    const index = users.findIndex((u) => u.id === id);
    
    if (index === -1) throw new Error("Usuario no encontrado");

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== users[index].email) {
      if (users.some(u => u.email === updates.email)) {
        throw new Error("El correo electrónico ya está registrado");
      }
    }

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return updatedUser;
  },

  deleteUser: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = await userService.getUsers();
    
    if (users.length <= 1) {
      throw new Error("No puedes eliminar el último usuario del sistema");
    }
    
    const filteredUsers = users.filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredUsers));
  },
};

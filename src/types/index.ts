export interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  photoUrl?: string;
  createdAt?: number;
}

export interface User {
  id?: string;
  email: string;
  password?: string;
  name: string;
  createdAt?: number;
}

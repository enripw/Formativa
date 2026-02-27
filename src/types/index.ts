export interface Team {
  id?: string;
  name: string;
  createdAt?: number;
}

export interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  photoUrl?: string;
  teamId: string;
  createdAt?: number;
}

export interface User {
  id?: string;
  email: string;
  password?: string;
  name: string;
  role?: 'admin' | 'team_admin' | 'viewer';
  teamId?: string;
  createdAt?: number;
}

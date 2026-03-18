export interface Team {
  id?: string;
  name: string;
  logoUrl?: string;
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
  category?: string;
  position?: string;
  createdAt?: number;
}

export interface User {
  id?: string;
  email: string;
  password?: string;
  name: string;
  role?: 'admin' | 'team_admin' | 'viewer';
  teamId?: string;
  photoUrl?: string;
  createdAt?: number;
}

export interface AppSettings {
  id?: string;
  appName: string;
  logoUrl?: string;
  credentialBgUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tournamentsEnabled?: boolean;
  updatedAt?: number;
}

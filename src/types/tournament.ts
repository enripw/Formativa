export interface Tournament {
  id?: string;
  year: number;
  name: string;
  status: 'draft' | 'leveling' | 'main' | 'finished';
  createdAt?: number;
}

export interface CategoryDefinition {
  name: string;
  relativeYears: number[]; // e.g., [15, 16] for 15-16 years old, or exact birth years like [2010, 2011]
}

export interface TournamentCategory {
  id?: string;
  tournamentId: string;
  name: string;
  birthYears: number[];
}

export interface Group {
  id?: string;
  tournamentId: string;
  categoryId: string;
  name: string;
  teams: string[];
}

export interface League {
  id?: string;
  tournamentId: string;
  categoryId: string;
  type: 'championship' | 'cup';
  teams: string[];
  teamReplacements?: Record<string, string>;
}

export interface Match {
  id?: string;
  tournamentId: string;
  categoryId: string;
  phase: 'leveling' | 'championship' | 'cup' | 'promotion';
  groupId?: string;
  leagueId?: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'played' | 'cancelled';
  date?: number;
  promotionResolved?: boolean;
}

export interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

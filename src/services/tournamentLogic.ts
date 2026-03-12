import { Player, Team } from "../types";
import { 
  TournamentCategory, 
  CategoryDefinition, 
  Group, 
  Match, 
  TeamStanding, 
  League 
} from "../types/tournament";

/**
 * Genera las categorías dinámicamente según el año del torneo.
 * @param tournamentId ID del torneo
 * @param tournamentYear Año del torneo (ej: 2026)
 * @param definitions Definiciones de categorías con años de nacimiento
 */
export function generateCategories(
  tournamentId: string, 
  tournamentYear: number, 
  definitions: { name: string, birthYears: number[] }[]
): TournamentCategory[] {
  return definitions.map(def => ({
    id: `cat_${tournamentId}_${def.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    tournamentId,
    name: def.name,
    birthYears: def.birthYears,
  }));
}

/**
 * Obtiene los IDs de los equipos que tienen jugadores en una categoría específica.
 * @param players Lista de todos los jugadores
 * @param category La categoría a evaluar
 */
export function getTeamsForCategory(players: Player[], category: TournamentCategory): string[] {
  const teamIds = new Set<string>();
  
  players.forEach(player => {
    if (!player.birthDate) return;
    const birthYear = new Date(player.birthDate).getFullYear();
    if (category.birthYears.includes(birthYear)) {
      teamIds.add(player.teamId);
    }
  });

  return Array.from(teamIds);
}

/**
 * Mezcla un array aleatoriamente (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Genera grupos de 3 o 4 equipos para la fase de nivelación.
 */
export function generateGroups(
  tournamentId: string, 
  categoryId: string, 
  teamIds: string[]
): Group[] {
  const shuffledTeams = shuffleArray(teamIds);
  const totalTeams = shuffledTeams.length;
  
  if (totalTeams < 6) {
    throw new Error("Se necesitan al menos 6 equipos para generar grupos (mínimo 3 por zona).");
  }

  // Lógica para dividir en grupos de 3 o 4
  // Buscamos la combinación que maximice los grupos de 4
  let x = Math.floor(totalTeams / 4);
  let y = 0;
  let found = false;
  
  while (x >= 0) {
    const remainder = totalTeams - (x * 4);
    if (remainder % 3 === 0) {
      y = remainder / 3;
      found = true;
      break;
    }
    x--;
  }

  if (!found) {
    throw new Error("No es posible dividir los equipos en grupos de 3 o 4.");
  }

  const numGroups = x + y;

  const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
    id: `grp_${categoryId}_${i + 1}`,
    tournamentId,
    categoryId,
    name: `Grupo ${String.fromCharCode(65 + i)}`, // Grupo A, B, C...
    teams: [],
  }));

  // Distribuir equipos: primeros 'x' grupos tienen 4 equipos, los siguientes 'y' grupos tienen 3 equipos.
  let teamIndex = 0;
  for (let i = 0; i < numGroups; i++) {
    const groupSize = i < x ? 4 : 3;
    for (let j = 0; j < groupSize; j++) {
      groups[i].teams.push(shuffledTeams[teamIndex]);
      teamIndex++;
    }
  }

  return groups;
}

/**
 * Genera un fixture de todos contra todos (round-robin) para un grupo de equipos.
 * Si hay un número impar de equipos, se añade un "descanso" (bye).
 */
export function generateRoundRobinFixtures(
  tournamentId: string,
  categoryId: string,
  phase: 'leveling' | 'championship' | 'cup',
  groupIdOrLeagueId: string,
  teamIds: string[],
  doubleRound: boolean = false
): Match[] {
  const matches: Match[] = [];
  let teams = [...teamIds];
  
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = teams[i];
      const away = teams[numTeams - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({
          id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tournamentId,
          categoryId,
          phase,
          ...(phase === 'leveling' ? { groupId: groupIdOrLeagueId } : { leagueId: groupIdOrLeagueId }),
          round: round + 1,
          homeTeamId: (round % 2 === 0) ? home : away, // Alternar localía
          awayTeamId: (round % 2 === 0) ? away : home,
          status: 'scheduled',
        });
      }
    }
    
    // Rotar equipos (el primero se queda fijo)
    const lastTeam = teams.pop()!;
    teams.splice(1, 0, lastTeam);
  }

  // Si es ida y vuelta, duplicamos invirtiendo localía
  if (doubleRound) {
    const firstLegMatches = [...matches];
    firstLegMatches.forEach(match => {
      matches.push({
        ...match,
        id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        round: match.round + numRounds,
        homeTeamId: match.awayTeamId,
        awayTeamId: match.homeTeamId,
      });
    });
  }

  return matches;
}

/**
 * Calcula la tabla de posiciones a partir de una lista de partidos y equipos.
 */
export function calculateStandings(matches: Match[], teamIds: string[], teamReplacements?: Record<string, string>): TeamStanding[] {
  const standingsMap = new Map<string, TeamStanding>();

  // Inicializar tabla
  teamIds.forEach(teamId => {
    standingsMap.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });

  // Procesar partidos jugados
  matches.forEach(match => {
    if (match.status !== 'played' || match.homeScore === undefined || match.awayScore === undefined) return;

    let homeTeamId = match.homeTeamId;
    let awayTeamId = match.awayTeamId;

    if (teamReplacements) {
      if (teamReplacements[homeTeamId]) homeTeamId = teamReplacements[homeTeamId];
      if (teamReplacements[awayTeamId]) awayTeamId = teamReplacements[awayTeamId];
    }

    const homeStats = standingsMap.get(homeTeamId);
    const awayStats = standingsMap.get(awayTeamId);

    if (!homeStats || !awayStats) return;

    homeStats.played += 1;
    awayStats.played += 1;

    homeStats.goalsFor += match.homeScore;
    homeStats.goalsAgainst += match.awayScore;
    homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;

    awayStats.goalsFor += match.awayScore;
    awayStats.goalsAgainst += match.homeScore;
    awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;

    if (match.homeScore > match.awayScore) {
      homeStats.won += 1;
      homeStats.points += 3;
      awayStats.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      awayStats.won += 1;
      awayStats.points += 3;
      homeStats.lost += 1;
    } else {
      homeStats.drawn += 1;
      homeStats.points += 1;
      awayStats.drawn += 1;
      awayStats.points += 1;
    }
  });

  // Convertir a array y ordenar
  const standings = Array.from(standingsMap.values());

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points; // 1. Puntos
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference; // 2. Diferencia de gol
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor; // 3. Goles a favor
    return 0; // Podría añadirse resultado entre sí (H2H) aquí
  });

  return standings;
}

/**
 * Transición de fase de nivelación a ligas principales.
 * Los 2 primeros de cada grupo van a Championship, el resto a Cup.
 */
export function generateMainLeagues(
  tournamentId: string,
  categoryId: string,
  groups: Group[],
  levelingMatches: Match[]
): { championship: League, cup: League } {
  const championshipTeams: string[] = [];
  const cupTeams: string[] = [];

  groups.forEach(group => {
    const groupMatches = levelingMatches.filter(m => m.groupId === group.id);
    const standings = calculateStandings(groupMatches, group.teams);

    // Los 2 primeros a Championship
    standings.slice(0, 2).forEach(s => championshipTeams.push(s.teamId));
    // El resto a Cup
    standings.slice(2).forEach(s => cupTeams.push(s.teamId));
  });

  return {
    championship: {
      id: `league_${categoryId}_championship`,
      tournamentId,
      categoryId,
      type: 'championship',
      teams: championshipTeams,
    },
    cup: {
      id: `league_${categoryId}_cup`,
      tournamentId,
      categoryId,
      type: 'cup',
      teams: cupTeams,
    }
  };
}

/**
 * Genera el partido de promoción (1ro de Cup vs Último de Championship)
 */
export function generatePromotionMatch(
  tournamentId: string,
  categoryId: string,
  championship: League,
  cup: League,
  mainMatches: Match[]
): Match | null {
  const champMatches = mainMatches.filter(m => m.leagueId === championship.id);
  const cupMatches = mainMatches.filter(m => m.leagueId === cup.id);

  const champStandings = calculateStandings(champMatches, championship.teams, championship.teamReplacements);
  const cupStandings = calculateStandings(cupMatches, cup.teams, cup.teamReplacements);

  if (champStandings.length === 0 || cupStandings.length === 0) return null;

  const lastChamp = champStandings[champStandings.length - 1].teamId;
  const firstCup = cupStandings[0].teamId;

  return {
    id: `match_${Date.now()}_promotion`,
    tournamentId,
    categoryId,
    phase: 'promotion',
    round: 1,
    homeTeamId: firstCup, // Cup team plays at home (or neutral)
    awayTeamId: lastChamp,
    status: 'scheduled',
  };
}

/**
 * Resuelve el partido de promoción y actualiza las ligas.
 * Si gana el equipo de Cup, asciende y el de Championship desciende.
 */
export function resolvePromotionMatch(
  match: Match,
  championship: League,
  cup: League,
  mainMatches: Match[]
): { newChampionship: League, newCup: League, updatedMatches: Match[], resolvedMatch: Match } {
  if (match.status !== 'played' || match.homeScore === undefined || match.awayScore === undefined) {
    throw new Error("El partido de promoción no ha finalizado.");
  }

  const cupTeamId = match.homeTeamId;
  const champTeamId = match.awayTeamId;

  let newChampTeams = [...championship.teams];
  let newCupTeams = [...cup.teams];
  let updatedMatches: Match[] = [];
  let newChampReplacements = { ...(championship.teamReplacements || {}) };
  let newCupReplacements = { ...(cup.teamReplacements || {}) };

  // Si el equipo de Cup gana (o por penales, aquí simplificado a resultado regular)
  if (match.homeScore > match.awayScore) {
    // Ascenso / Descenso
    newChampTeams = newChampTeams.filter(id => id !== champTeamId);
    newChampTeams.push(cupTeamId);
    
    for (const [oldId, newId] of Object.entries(newChampReplacements)) {
      if (newId === champTeamId) newChampReplacements[oldId] = cupTeamId;
    }
    newChampReplacements[champTeamId] = cupTeamId;

    newCupTeams = newCupTeams.filter(id => id !== cupTeamId);
    newCupTeams.push(champTeamId);
    
    for (const [oldId, newId] of Object.entries(newCupReplacements)) {
      if (newId === cupTeamId) newCupReplacements[oldId] = champTeamId;
    }
    newCupReplacements[cupTeamId] = champTeamId;

    // Swap teams in all unplayed matches of both leagues so they inherit remaining fixtures
    updatedMatches = mainMatches.map(m => {
      if ((m.leagueId === championship.id || m.leagueId === cup.id) && m.status !== 'played') {
        let newHome = m.homeTeamId;
        let newAway = m.awayTeamId;

        if (newHome === champTeamId) newHome = cupTeamId;
        else if (newHome === cupTeamId) newHome = champTeamId;

        if (newAway === champTeamId) newAway = cupTeamId;
        else if (newAway === cupTeamId) newAway = champTeamId;

        if (newHome !== m.homeTeamId || newAway !== m.awayTeamId) {
          return { ...m, homeTeamId: newHome, awayTeamId: newAway };
        }
      }
      return m;
    }).filter(m => m.homeTeamId !== m.awayTeamId); // Just in case, though they shouldn't play themselves
  }

  return {
    newChampionship: { ...championship, teams: newChampTeams, teamReplacements: match.homeScore > match.awayScore ? newChampReplacements : championship.teamReplacements },
    newCup: { ...cup, teams: newCupTeams, teamReplacements: match.homeScore > match.awayScore ? newCupReplacements : cup.teamReplacements },
    updatedMatches: updatedMatches.filter(m => mainMatches.find(old => old.id === m.id && (old.homeTeamId !== m.homeTeamId || old.awayTeamId !== m.awayTeamId))),
    resolvedMatch: { ...match, promotionResolved: true }
  };
}

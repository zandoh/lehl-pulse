/**
 * Backfill Script - Import Historical Seasons
 *
 * Imports league data from ESPN for specified year(s).
 * Run: tsx scripts/backfill.ts [year]
 * Example: tsx scripts/backfill.ts 2025
 */

import { config } from 'dotenv';
config();

import { db, schema } from '../packages/database/src/index';
import { ESPNClient } from '../packages/espn-client/src/index';
import { eq, and } from 'drizzle-orm';

interface ImportStats {
  ownersCreated: number;
  ownersFound: number;
  teamsCreated: number;
  teamsUpdated: number;
  matchupsCreated: number;
}

interface MemberData {
  displayName: string;
  firstName?: string;
  lastName?: string;
}

type MemberMap = Map<string, MemberData>;
type TeamIdMap = Map<number, string>;

/**
 * Creates a lookup map of ESPN member IDs to their display names and full names
 */
function createMemberMap(members: any[]): MemberMap {
  const memberMap = new Map<string, MemberData>();

  for (const member of members) {
    const displayName = member.displayName ||
                        (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.id);
    memberMap.set(member.id, {
      displayName,
      firstName: member.firstName,
      lastName: member.lastName,
    });
  }

  return memberMap;
}

/**
 * Finds or creates an owner in the database
 */
async function findOrCreateOwner(
  ownerIdentifier: string,
  memberMap: MemberMap,
  stats: ImportStats
): Promise<string | undefined> {
  const memberData = memberMap.get(ownerIdentifier);
  const displayName = memberData?.displayName || ownerIdentifier;
  const firstName = memberData?.firstName;
  const lastName = memberData?.lastName;

  let owner = await db.query.owners.findFirst({
    where: eq(schema.owners.espnOwnerId, ownerIdentifier),
  });

  if (owner) {
    const needsUpdate =
      owner.displayName !== displayName ||
      owner.firstName !== firstName ||
      owner.lastName !== lastName;

    if (needsUpdate) {
      [owner] = await db
        .update(schema.owners)
        .set({
          displayName,
          firstName,
          lastName,
          updatedAt: new Date(),
        })
        .where(eq(schema.owners.id, owner.id))
        .returning();
      console.log(`Owner updated: ${owner.displayName} (${firstName} ${lastName})`);
    }
    stats.ownersFound++;
  } else {
    [owner] = await db
      .insert(schema.owners)
      .values({
        displayName,
        firstName,
        lastName,
        espnOwnerId: ownerIdentifier,
      })
      .returning();
    stats.ownersCreated++;
    console.log(`Owner created: ${owner.displayName} (${firstName} ${lastName})`);
  }

  return owner.id;
}

/**
 * Creates or updates a team in the database
 */
async function createOrUpdateTeam(
  espnTeam: any,
  leagueSeasonId: string,
  ownerId: string | undefined,
  teamIdMap: TeamIdMap,
  stats: ImportStats
): Promise<void> {
  const existingTeam = await db.query.teams.findFirst({
    where: and(
      eq(schema.teams.leagueSeasonId, leagueSeasonId),
      eq(schema.teams.espnSeasonTeamId, espnTeam.id)
    ),
  });

  if (existingTeam) {
    const [updatedTeam] = await db
      .update(schema.teams)
      .set({
        ownerId,
        teamName: espnTeam.name,
        abbreviation: espnTeam.abbrev,
        logoUrl: espnTeam.logo,
        updatedAt: new Date(),
      })
      .where(eq(schema.teams.id, existingTeam.id))
      .returning();
    teamIdMap.set(espnTeam.id, updatedTeam.id);
    stats.teamsUpdated++;
  } else {
    const [newTeam] = await db
      .insert(schema.teams)
      .values({
        leagueSeasonId,
        ownerId,
        espnSeasonTeamId: espnTeam.id,
        teamName: espnTeam.name,
        abbreviation: espnTeam.abbrev,
        logoUrl: espnTeam.logo,
      })
      .returning();
    teamIdMap.set(espnTeam.id, newTeam.id);
    stats.teamsCreated++;
    console.log(`Team created: ${newTeam.teamName} (${newTeam.abbreviation})`);
  }
}

/**
 * Processes all teams and their owners from ESPN data
 */
async function processTeamsAndOwners(
  espnTeams: any[],
  memberMap: MemberMap,
  leagueSeasonId: string,
  stats: ImportStats
): Promise<TeamIdMap> {
  console.log('Processing teams and owners...');
  const teamIdMap = new Map<number, string>();

  for (const espnTeam of espnTeams) {
    const ownerIdentifier = espnTeam.primaryOwner || espnTeam.owners?.[0];

    let ownerId: string | undefined;
    if (ownerIdentifier) {
      ownerId = await findOrCreateOwner(ownerIdentifier, memberMap, stats);
    }

    await createOrUpdateTeam(espnTeam, leagueSeasonId, ownerId, teamIdMap, stats);
  }

  console.log(`Teams processed: ${stats.teamsCreated} created, ${stats.teamsUpdated} updated`);
  console.log(`Owners processed: ${stats.ownersCreated} created, ${stats.ownersFound} found\n`);

  return teamIdMap;
}

/**
 * Creates or updates a single matchup in the database
 */
async function createOrUpdateMatchup(
  espnMatchup: any,
  leagueSeasonId: string,
  teamIdMap: TeamIdMap,
  regularSeasonPeriods: number,
  stats: ImportStats
): Promise<void> {
  if (!espnMatchup.home || !espnMatchup.away) {
    return;
  }

  const homeTeamId = teamIdMap.get(espnMatchup.home.teamId);
  const awayTeamId = teamIdMap.get(espnMatchup.away.teamId);

  if (!homeTeamId || !awayTeamId) {
    console.warn(`Warning: Skipping matchup - missing team mapping (home: ${espnMatchup.home.teamId}, away: ${espnMatchup.away.teamId})`);
    return;
  }

  const isPlayoffs = espnMatchup.matchupPeriodId > regularSeasonPeriods;
  const homeScore = (espnMatchup.home.cumulativeScore?.wins || espnMatchup.home.totalPoints || 0).toString();
  const awayScore = (espnMatchup.away.cumulativeScore?.wins || espnMatchup.away.totalPoints || 0).toString();

  const existingMatchup = await db.query.matchups.findFirst({
    where: and(
      eq(schema.matchups.leagueSeasonId, leagueSeasonId),
      eq(schema.matchups.matchupPeriod, espnMatchup.matchupPeriodId),
      eq(schema.matchups.homeTeamId, homeTeamId),
      eq(schema.matchups.awayTeamId, awayTeamId)
    ),
  });

  if (existingMatchup) {
    await db
      .update(schema.matchups)
      .set({
        homeScore,
        awayScore,
        isPlayoffs,
        isChampionship: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.matchups.id, existingMatchup.id));
  } else {
    await db.insert(schema.matchups).values({
      leagueSeasonId,
      matchupPeriod: espnMatchup.matchupPeriodId,
      scoringPeriod: espnMatchup.matchupPeriodId,
      homeTeamId,
      homeScore,
      awayTeamId,
      awayScore,
      isPlayoffs,
      isChampionship: false,
    });

    stats.matchupsCreated++;
  }
}

/**
 * Creates all matchups from ESPN data
 */
async function createMatchups(
  espnMatchups: any[],
  leagueSeasonId: string,
  teamIdMap: TeamIdMap,
  regularSeasonPeriods: number,
  stats: ImportStats
): Promise<void> {
  console.log('Creating matchups...');

  for (const espnMatchup of espnMatchups) {
    await createOrUpdateMatchup(espnMatchup, leagueSeasonId, teamIdMap, regularSeasonPeriods, stats);
  }

  console.log(`Matchups created: ${stats.matchupsCreated}\n`);
}

/**
 * Identifies semi-final winners from matchup data
 */
function findSemiFinalsWinners(espnMatchups: any[], semiFinalsWeek: number): Set<number> {
  const semiFinalsWinners = new Set<number>();

  const semiFinalMatchups = espnMatchups.filter(m =>
    m.matchupPeriodId === semiFinalsWeek &&
    m.home && m.away && m.winner
  );

  for (const m of semiFinalMatchups) {
    if (m.winner === 'HOME' && m.home) {
      semiFinalsWinners.add(m.home.teamId);
    } else if (m.winner === 'AWAY' && m.away) {
      semiFinalsWinners.add(m.away.teamId);
    }
  }

  return semiFinalsWinners;
}

/**
 * Identifies and marks the championship matchup
 */
async function markChampionshipMatchup(
  espnMatchups: any[],
  leagueSeasonId: string,
  teamIdMap: TeamIdMap,
  championshipWeek: number
): Promise<void> {
  console.log('Identifying championship matchup...');

  const semiFinalsWeek = championshipWeek - 1;
  const semiFinalsWinners = findSemiFinalsWinners(espnMatchups, semiFinalsWeek);

  console.log(`Semi-finals winners (period ${semiFinalsWeek}): ${Array.from(semiFinalsWinners).join(', ')}`);

  const championshipCandidates = espnMatchups.filter(m =>
    m.matchupPeriodId === championshipWeek &&
    m.home && m.away &&
    semiFinalsWinners.has(m.home.teamId) &&
    semiFinalsWinners.has(m.away.teamId)
  );

  console.log(`Found ${championshipCandidates.length} championship candidate(s)`);

  if (championshipCandidates.length > 0) {
    const championshipMatchup = championshipCandidates[0];
    const homeTeamId = teamIdMap.get(championshipMatchup.home!.teamId);
    const awayTeamId = teamIdMap.get(championshipMatchup.away!.teamId);

    if (homeTeamId && awayTeamId) {
      await db
        .update(schema.matchups)
        .set({
          isChampionship: true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.matchups.leagueSeasonId, leagueSeasonId),
          eq(schema.matchups.matchupPeriod, championshipWeek),
          eq(schema.matchups.homeTeamId, homeTeamId),
          eq(schema.matchups.awayTeamId, awayTeamId)
        ));

      console.log(`Championship: Team ${championshipMatchup.home!.teamId} vs Team ${championshipMatchup.away!.teamId}`);
    }
  } else {
    console.log(`Warning: Could not identify championship matchup`);
  }

  console.log('');
}

async function backfill(year: number) {
  console.log(`Backfilling data for ${year} season...\n`);

  const stats: ImportStats = {
    ownersCreated: 0,
    ownersFound: 0,
    teamsCreated: 0,
    teamsUpdated: 0,
    matchupsCreated: 0,
  };

  if (!process.env.ESPN_LEAGUE_ID) {
    throw new Error('ESPN_LEAGUE_ID not set');
  }

  const client = new ESPNClient({
    leagueId: process.env.ESPN_LEAGUE_ID,
    espnS2: process.env.ESPN_S2_COOKIE,
    swid: process.env.ESPN_SWID_COOKIE,
  });

  console.log('Fetching data from ESPN...');
  const espnData = await client.getFullLeagueData(year);
  console.log(`Fetched: ${espnData.teams.length} teams, ${espnData.matchups.length} matchups\n`);

  console.log('Finding or creating league...');
  let league = await db.query.leagues.findFirst({
    where: eq(schema.leagues.espnLeagueId, process.env.ESPN_LEAGUE_ID),
  });

  if (league) {
    console.log(`League found: ${league.name}\n`);
  } else {
    console.log('Creating new league...');
    [league] = await db
      .insert(schema.leagues)
      .values({
        espnLeagueId: process.env.ESPN_LEAGUE_ID,
        name: espnData.settings.name,
        espnS2Cookie: process.env.ESPN_S2_COOKIE,
        swidCookie: process.env.ESPN_SWID_COOKIE,
      })
      .returning();
    console.log(`League created: ${league.name}\n`);
  }

  console.log(`Creating or updating season ${year}...`);
  let leagueSeason = await db.query.leagueSeasons.findFirst({
    where: and(
      eq(schema.leagueSeasons.leagueId, league.id),
      eq(schema.leagueSeasons.year, year)
    ),
  });

  if (leagueSeason) {
    [leagueSeason] = await db
      .update(schema.leagueSeasons)
      .set({  
        settings: espnData.settings,
        updatedAt: new Date(),
      })
      .where(eq(schema.leagueSeasons.id, leagueSeason.id))
      .returning();
    console.log(`Season ${year} updated\n`);
  } else {
    [leagueSeason] = await db
      .insert(schema.leagueSeasons)
      .values({
        leagueId: league.id,
        year,
        settings: espnData.settings,
      })
      .returning();
    console.log(`Season ${year} created\n`);
  }

  const regularSeasonPeriods = Object.keys(espnData.settings.scheduleSettings?.matchupPeriods || {}).length || 20;
  const maxMatchupPeriod = Math.max(...espnData.matchups.map(m => m.matchupPeriodId));
  const championshipWeek = maxMatchupPeriod;

  console.log(`Regular season: ${regularSeasonPeriods} periods, Playoffs start at period ${regularSeasonPeriods + 1}`);
  console.log(`Championship week: Period ${championshipWeek}\n`);

  const memberMap = createMemberMap(espnData.members);
  const teamIdMap = await processTeamsAndOwners(espnData.teams, memberMap, leagueSeason.id, stats);
  
  await createMatchups(espnData.matchups, leagueSeason.id, teamIdMap, regularSeasonPeriods, stats);
  await markChampionshipMatchup(espnData.matchups, leagueSeason.id, teamIdMap, championshipWeek);

  console.log('Import Summary:');
  console.log(`League: ${league.name}`);
  console.log(`Season: ${year}`);
  console.log(`Owners: ${stats.ownersCreated} created, ${stats.ownersFound} found`);
  console.log(`Teams: ${stats.teamsCreated} created, ${stats.teamsUpdated} updated`);
  console.log(`Matchups: ${stats.matchupsCreated} created`);
  console.log('\nBackfill complete!');
}

// Main execution
const yearArg = process.argv[2];
const year = yearArg ? Number.parseInt(yearArg, 10) : 2025;

if (Number.isNaN(year)) {
  console.error('Error: Invalid year provided');
  process.exit(1);
}

try {
  await backfill(year);
} catch (error) {
  console.error('\nError during backfill:', error);
  process.exit(1);
} finally {
  process.exit(0);
}

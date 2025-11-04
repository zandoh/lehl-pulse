import { pgTable, uuid, integer, decimal, boolean, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { leagueSeasons } from './league-seasons';
import { teams } from './teams';

export const matchups = pgTable('matchups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leagueSeasonId: uuid('league_season_id').notNull().references(() => leagueSeasons.id, { onDelete: 'cascade' }),
  matchupPeriod: integer('matchup_period').notNull(),
  scoringPeriod: integer('scoring_period').notNull(),
  homeTeamId: uuid('home_team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  homeScore: decimal('home_score', { precision: 10, scale: 2 }).notNull(),
  awayTeamId: uuid('away_team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  awayScore: decimal('away_score', { precision: 10, scale: 2 }).notNull(),
  isPlayoffs: boolean('is_playoffs').notNull().default(false),
  isChampionship: boolean('is_championship').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  check('chk_different_teams', sql`${table.homeTeamId} != ${table.awayTeamId}`),
  check('chk_positive_scores', sql`${table.homeScore} >= 0 AND ${table.awayScore} >= 0`),
]);

export type Matchup = typeof matchups.$inferSelect;
export type NewMatchup = typeof matchups.$inferInsert;

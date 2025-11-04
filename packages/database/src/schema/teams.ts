import { pgTable, uuid, integer, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { leagueSeasons } from './league-seasons';
import { owners } from './owners';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leagueSeasonId: uuid('league_season_id').notNull().references(() => leagueSeasons.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').references(() => owners.id),
  espnSeasonTeamId: integer('espn_season_team_id').notNull(),
  teamName: varchar('team_name', { length: 255 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 10 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  unique().on(table.leagueSeasonId, table.espnSeasonTeamId),
]);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

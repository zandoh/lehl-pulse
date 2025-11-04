import { pgTable, uuid, varchar, decimal, integer, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { leagues } from './leagues';
import { owners } from './owners';
import { teams } from './teams';

export const allTimeRecords = pgTable('all_time_records', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid('league_id').notNull().references(() => leagues.id, { onDelete: 'cascade' }),
  recordType: varchar('record_type', { length: 100 }).notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  holderOwnerId: uuid('holder_owner_id').references(() => owners.id),
  holderTeamId: uuid('holder_team_id').references(() => teams.id),
  holderDisplayName: varchar('holder_display_name', { length: 255 }),
  seasonYear: integer('season_year'),
  week: integer('week'),
  opponentTeamId: uuid('opponent_team_id').references(() => teams.id),
  opponentDisplayName: varchar('opponent_display_name', { length: 255 }),
  metadata: jsonb('metadata'),
  lastComputedAt: timestamp('last_computed_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  unique().on(table.leagueId, table.recordType),
]);

export type AllTimeRecord = typeof allTimeRecords.$inferSelect;
export type NewAllTimeRecord = typeof allTimeRecords.$inferInsert;

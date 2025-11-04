import { pgTable, uuid, integer, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { leagues } from './leagues';

export const leagueSeasons = pgTable('league_seasons', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  leagueId: uuid('league_id').notNull().references(() => leagues.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  unique().on(table.leagueId, table.year),
]);

export type LeagueSeason = typeof leagueSeasons.$inferSelect;
export type NewLeagueSeason = typeof leagueSeasons.$inferInsert;

import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const leagues = pgTable('leagues', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  espnLeagueId: varchar('espn_league_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  espnS2Cookie: text('espn_s2_cookie'),
  swidCookie: varchar('swid_cookie', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;

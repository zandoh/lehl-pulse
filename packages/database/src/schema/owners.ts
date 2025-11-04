import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  espnOwnerId: varchar('espn_owner_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;

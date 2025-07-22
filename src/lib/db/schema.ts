import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const availability = pgTable('availability', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  hours: jsonb('hours').notNull().default('{}'), // { "19": "ready", "20": "uncertain", "21": "unready" }
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;

export type Availability = typeof availability.$inferSelect;

export type AvailabilityStatus = 'ready' | 'uncertain' | 'unready' | 'unknown';

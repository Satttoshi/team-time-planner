import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: ['player', 'coach'] })
    .notNull()
    .default('player'),
  sortOrder: integer('sort_order').notNull().default(1),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const availability = pgTable('availability', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  hours: jsonb('hours').notNull().default('{}'), // { "19": "ready", "20": "uncertain", "21": "unready", "22": "ready", "23": "uncertain" }
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const matchDocuments = pgTable('match_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('Untitled match plan'),
  content: jsonb('content').notNull().default('{}'), // Tiptap JSON document
  matchDate: timestamp('match_date', { withTimezone: true })
    .notNull()
    .defaultNow(), // when the FACEIT match takes place
  version: integer('version').notNull().default(0), // optimistic concurrency counter
  presence: jsonb('presence').notNull().default('{}'), // { "<clientId>": "<ISO timestamp>" }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Player = typeof players.$inferSelect;

export type MatchDocument = typeof matchDocuments.$inferSelect;

export type Availability = typeof availability.$inferSelect;

export type AvailabilityStatus = 'ready' | 'uncertain' | 'unready' | 'unknown';

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),
  email:      text('email').notNull(),
  name:       text('name'),
  createdAt:  text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id:            text('id').primaryKey(),
  userId:        text('user_id').notNull().references(() => users.id),
  date:          text('date').notNull(),
  notes:         text('notes').notNull().default(''),
  data:          text('data').notNull(),
  createdAt:     text('created_at').notNull(),
  updatedAt:     text('updated_at').notNull(),
  deletedAt:     text('deleted_at'),
  clientVersion: integer('client_version').notNull().default(0),
});

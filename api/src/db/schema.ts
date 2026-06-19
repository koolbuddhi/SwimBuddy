import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id:         text('id').primaryKey(),
  email:      text('email').notNull(),
  name:       text('name'),
  createdAt:  text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id:                 text('id').primaryKey(),
  userId:             text('user_id').notNull().references(() => users.id),
  date:               text('date').notNull(),
  notes:              text('notes').notNull().default(''),
  data:               text('data').notNull(),
  createdAt:          text('created_at').notNull(),
  updatedAt:          text('updated_at').notNull(),
  deletedAt:          text('deleted_at'),
  clientVersion:      integer('client_version').notNull().default(0),
  lastEditedByUserId: text('last_edited_by_user_id'),
  lastEditedAt:       text('last_edited_at'),
});

export const shares = sqliteTable('shares', {
  id:               text('id').primaryKey(),
  ownerUserId:      text('owner_user_id').notNull().references(() => users.id),
  recipientUserId:  text('recipient_user_id').notNull().references(() => users.id),
  permission:       text('permission').notNull(),
  status:           text('status').notNull(),
  createdAt:        text('created_at').notNull(),
  acceptedAt:       text('accepted_at'),
  revokedAt:        text('revoked_at'),
});

export type SharePermission = 'read' | 'write';
export type ShareStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

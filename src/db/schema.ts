import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Anonymous record of an enhancement performed by a user.
 *
 * IMPORTANT: We deliberately do NOT store any image data or personally
 * identifiable information. Only aggregate metrics (target resolution and
 * pixel counts) are persisted so we can power a public usage dashboard.
 */
export const enhancements = pgTable("enhancements", {
  id: serial("id").primaryKey(),
  resolution: text("resolution").notNull(), // "2K" | "4K" | "8K"
  sourcePixels: integer("source_pixels").notNull(),
  outputPixels: integer("output_pixels").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameState = sqliteTable("game_state", {
  id: integer("id").primaryKey(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** The same seven cinema reactions are accepted by HTTP, WebSockets, and the player. */
export const THEATER_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥", "👍"] as const;
export type TheaterEmoji = typeof THEATER_REACTIONS[number];
export const REACTION_LIFETIME_MS = 2800;

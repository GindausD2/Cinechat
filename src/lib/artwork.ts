// Upgrade the original seeded artwork without overriding custom administrator uploads.
// Individual sources, credits, and licenses live in public/art/films/licenses.json.
const collection: Record<string, { legacy: string; poster: string; backdrop: string }> = {
  "big-buck-bunny": { legacy: "/art/bunny.svg", poster: "/art/films/bunny-poster.webp", backdrop: "/art/films/bunny-still.webp" },
  "sintel": { legacy: "/art/sintel.svg", poster: "/art/films/sintel-poster.webp", backdrop: "/art/films/sintel-still.webp" },
  "tears-of-steel": { legacy: "/art/steel.svg", poster: "/art/films/steel-poster.webp", backdrop: "/art/films/steel-still.webp" },
  "cosmos-laundromat": { legacy: "/art/cosmos.svg", poster: "/art/films/cosmos-poster.webp", backdrop: "/art/films/cosmos-poster.webp" },
  "elephants-dream": { legacy: "/art/elephants.svg", poster: "/art/films/elephants-poster.webp", backdrop: "/art/films/elephants-still.webp" },
  "caminandes": { legacy: "/art/caminandes.svg", poster: "/art/films/caminandes-still.webp", backdrop: "/art/films/caminandes-still.webp" }
};
export function posterFor(movie: { id: string; poster: string }) {
  const art = collection[movie.id];
  return art && movie.poster === art.legacy ? art.poster : movie.poster;
}
export function backdropFor(movie: { id: string; poster: string; backdrop?: string }) {
  const art = collection[movie.id];
  if (art && (!movie.backdrop || movie.backdrop === art.legacy || (movie.id === "big-buck-bunny" && movie.backdrop === "/art/bunny-backdrop.jpg")) && movie.poster === art.legacy) return art.backdrop;
  return movie.backdrop || movie.poster;
}

export function filmAttribution(attribution: string) {
  const legacy = "© 2008 Blender Foundation / www.bigbuckbunny.org. Licensed under CC BY 3.0. Original poster composition by CineChat; film still © Blender Foundation.";
  // The old composition remains in the seed/assets for compatibility. New artwork
  // has its own credits; keep the film's required attribution and custom credits intact.
  return attribution === legacy ? "© 2008 Blender Foundation / www.bigbuckbunny.org. Licensed under CC BY 3.0." : attribution;
}

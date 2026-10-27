/** Curated factual credits checked against the linked official project pages, 26 Oct 2026. */
type Entry = readonly [name: string, job: string, department: string, characterName?: string];
const groups: { movieId: string; sourceUrl: string; entries: Entry[] }[] = [
  { movieId: "big-buck-bunny", sourceUrl: "https://peach.blender.org/the-team/", entries: [
    ["Sacha Goedegebure", "Director", "Directing"], ["Sacha Goedegebure", "Writer", "Writing"], ["Ton Roosendaal", "Producer", "Production"],
    ["Andy Goralczyk", "Art director", "Art"], ["Enrico Valenza", "Lead artist", "Art"], ["Nathan Vegdahl", "Rigger and animator", "Animation"],
    ["William Reynish", "Animator", "Animation"], ["Brecht van Lommel", "Technical director", "Technical"], ["Campbell Barton", "Technical director", "Technical"], ["Jan Morgenstern", "Music and sound design", "Sound"]
  ] },
  { movieId: "sintel", sourceUrl: "https://durian.blender.org/about/", entries: [["Colin Levy", "Director", "Directing"], ["Ton Roosendaal", "Producer", "Production"], ["Jan Morgenstern", "Composer", "Sound"]] },
  { movieId: "sintel", sourceUrl: "https://durian.blender.org/news/casting-line-up-thom-hoffman-and-halina-reijn/", entries: [["Halina Reijn", "Voice actor", "Cast", "Sintel"], ["Thom Hoffman", "Voice actor", "Cast", "The Shaman"]] },
  { movieId: "tears-of-steel", sourceUrl: "https://mango.blender.org/about/", entries: [["Ian Hubert", "Director", "Directing"], ["Ian Hubert", "Writer", "Writing"], ["Ton Roosendaal", "Producer", "Production"], ["Joris Kerbosch", "Director of photography", "Camera"], ["Joram Letwory", "Composer", "Sound"]] },
  { movieId: "tears-of-steel", sourceUrl: "https://mango.blender.org/production/actor-line-up-movie-stars-derek-de-lint-sergio-hasselbaink-and-more/", entries: [
    ["Derek de Lint", "Actor", "Cast", "Old Thom"], ["Sergio Hasselbaink", "Actor", "Cast", "Barly"], ["Rogier Schippers", "Actor", "Cast", "Captain"],
    ["Vanja Rukavina", "Actor", "Cast", "Thom"], ["Denise Rebergen", "Actor", "Cast", "Celia"], ["Jody Bhe", "Actor", "Cast", "Djenghis"], ["Chris Haley", "Actor", "Cast", "Tech Head"]
  ] },
  { movieId: "cosmos-laundromat", sourceUrl: "https://gooseberry.blender.org/the-team/", entries: [["Mathieu Auvray", "Director", "Directing"], ["Ton Roosendaal", "Producer", "Production"]] },
  { movieId: "cosmos-laundromat", sourceUrl: "https://gooseberry.blender.org/cosmos-laundromat-actor-lineup/", entries: [["Pierre Bokma", "Voice actor", "Cast", "Franck"], ["Reinout Scholten van Aschat", "Voice actor", "Cast", "Victor"]] },
  { movieId: "cosmos-laundromat", sourceUrl: "https://gooseberry.blender.org/voice-acting-recording-the-film-set-way/", entries: [["Esther Wouda", "Writer", "Writing"]] },
  { movieId: "elephants-dream", sourceUrl: "https://orange.blender.org/theteam/", entries: [
    ["Bassam Kurdali", "Director", "Directing"], ["Ton Roosendaal", "Producer", "Production"], ["Andy Goralczyk", "Art director", "Art"], ["Jan Morgenstern", "Music and sound design", "Sound"],
    ["Cas Jansen", "Voice actor", "Cast", "Emo"], ["Tygo Gernandt", "Voice actor", "Cast", "Proog"], ["Pepijn Zwanenburg", "Writer", "Writing"], ["Enrico Valenza", "Additional artwork and animation", "Art"]
  ] },
  { movieId: "caminandes", sourceUrl: "https://studio.blender.org/projects/caminandes-2/pages/credits/", entries: [
    ["Pablo Vazquez", "Director", "Directing"], ["Francesco Siddi", "Producer", "Production"], ["Beorn Leonard", "Writer", "Writing"], ["Jan Morgenstern", "Music and sound", "Sound"],
    ["Hjalti Hjálmarsson", "Animation", "Animation"], ["Andy Goralczyk", "Lighting and rendering", "Lighting"], ["Sergey Sharybin", "Technical direction", "Technical"], ["Juan Pablo Bouza", "Rigging", "Animation"]
  ] }
];
const slugFor = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const verifiedCreditSeed = groups.flatMap(group => group.entries.map(([name, job, department, characterName], displayOrder) => ({ movieId: group.movieId, personSlug: slugFor(name), name, job, department, characterName: characterName || null, displayOrder, sourceUrl: group.sourceUrl, verifiedAt: new Date("2026-10-26T00:00:00Z") })));
export const tonPortrait = {
  portraitUrl: "/art/people/ton-roosendaal.jpg", portraitLicenseUrl: "https://creativecommons.org/licenses/by/3.0/nl/deed.en",
  portraitAttribution: "William Maanders, 2008 · CC BY 3.0 Netherlands · Original photograph, unchanged",
  portraitSourceUrl: "https://commons.wikimedia.org/wiki/File:Ton_Roosendaal_2008.jpg"
};

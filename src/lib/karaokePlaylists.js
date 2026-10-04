// Curated karaoke playlists shown on the main screen + guest phone.
//
// IMPORTANT: every entry is a *search query* (title + artist), NOT a
// hardcoded YouTube video id. Hardcoded ids pointed at official music
// videos, which are regularly region/embed blocked and are not karaoke
// (no on-screen lyrics) — that is why songs would not play.
//
// `karaokeResolver.js` turns each entry into a genuine, embeddable
// YouTube karaoke upload at request time (and caches the result), so
// every track that appears in the app is a real YouTube karaoke video.

export const PLAYLISTS = [
  {
    id: 'party-hits',
    name: 'Party Hits',
    emoji: '🎉',
    description: 'High-energy crowd-pleasers that get the whole room singing.',
    songs: [
      { title: 'Shape of You', artist: 'Ed Sheeran' },
      { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
      { title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee' },
      { title: 'Levitating', artist: 'Dua Lipa' },
      { title: 'Dancing Queen', artist: 'ABBA' },
      { title: "Can't Stop the Feeling", artist: 'Justin Timberlake' },
      { title: 'Sugar', artist: 'Maroon 5' },
      { title: 'Sweet Caroline', artist: 'Neil Diamond' },
    ],
  },
  {
    id: 'rock-classics',
    name: 'Rock Classics',
    emoji: '🎸',
    description: 'Legendary rock anthems built for a big chorus sing-along.',
    songs: [
      { title: 'Bohemian Rhapsody', artist: 'Queen' },
      { title: "Don't Stop Believin'", artist: 'Journey' },
      { title: "Livin' on a Prayer", artist: 'Bon Jovi' },
      { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
      { title: 'Wonderwall', artist: 'Oasis' },
      { title: 'Eye of the Tiger', artist: 'Survivor' },
      { title: "I Love Rock 'n' Roll", artist: 'Joan Jett' },
      { title: 'Highway to Hell', artist: 'AC/DC' },
    ],
  },
  {
    id: 'pop-ballads',
    name: 'Pop & Ballads',
    emoji: '💖',
    description: 'Emotional power ballads and modern pop favourites.',
    songs: [
      { title: 'Perfect', artist: 'Ed Sheeran' },
      { title: 'Rolling in the Deep', artist: 'Adele' },
      { title: 'Hello', artist: 'Adele' },
      { title: 'Someone Like You', artist: 'Adele' },
      { title: 'My Heart Will Go On', artist: 'Celine Dion' },
      { title: 'A Thousand Years', artist: 'Christina Perri' },
      { title: 'All of Me', artist: 'John Legend' },
      { title: 'Fix You', artist: 'Coldplay' },
    ],
  },
  {
    id: 'disney-showtunes',
    name: 'Disney & Showtunes',
    emoji: '🏰',
    description: 'Magical movie moments and Broadway showstoppers.',
    songs: [
      { title: 'Let It Go', artist: 'Idina Menzel' },
      { title: 'A Whole New World', artist: 'Peabo Bryson & Regina Belle' },
      { title: "How Far I'll Go", artist: "Auli'i Cravalho" },
      { title: 'Circle of Life', artist: 'Elton John' },
      { title: 'Colors of the Wind', artist: 'Vanessa Williams' },
      { title: 'Part of Your World', artist: 'Jodi Benson' },
      { title: 'Beauty and the Beast', artist: 'Celine Dion' },
      { title: 'Defying Gravity', artist: 'Idina Menzel' },
    ],
  },
];

export const DEFAULT_PLAYLIST_NAME = PLAYLISTS[0].name;

export function getPlaylistByName(name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return PLAYLISTS[0];
  return (
    PLAYLISTS.find((p) => p.name.toLowerCase() === wanted) ||
    PLAYLISTS.find((p) => p.id.toLowerCase() === wanted) ||
    null
  );
}

export function getPlaylistSummaries() {
  return PLAYLISTS.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    description: p.description,
    count: p.songs.length,
  }));
}

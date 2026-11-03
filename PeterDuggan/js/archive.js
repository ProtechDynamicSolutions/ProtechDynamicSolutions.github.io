/*
  The Archive page (archive.html): older work, the old showreel and music videos.

  To add a video by hand, copy one item and change it:
    client   who it was for (or the artist)
    title    the film's name
    drive    the Google Drive file id (the long code in its share link)
    poster   a still in img/archive/ ; leave "" to use Drive's own thumbnail
    length   seconds, shown as 1:25 ; 0 hides it
    year     optional, e.g. "2020"

  Or put the video in the matching Drive folder (each section's "driveFolder")
  and double-click ADD_TO_ARCHIVE.bat: it finds new videos, adds them here with
  a tidy name, and publishes. Fix any names it guessed afterwards.

  Everything below the next line must stay valid JSON (double quotes, no comments).
*/
window.ARCHIVE = {
  "intro": "Older work, the old showreel and music videos. Easier to talk through than to scroll past, so ask me about any of it.",
  "sections": [
    {
      "id": "showreel",
      "title": "Showreel",
      "driveFolder": "1P8OvsnEiiYPaRhCNw-ItXrX1dSHYkZ4r",
      "items": [
        { "client": "Peter J Duggan", "title": "Showreel 2025", "drive": "1Ta-QEPfLL36mDskDzuPnlcLCirk0lpMG", "poster": "img/archive/showreel-2025.webp", "length": 126, "year": "2025" }
      ]
    },
    {
      "id": "brands",
      "title": "Brands & agencies",
      "driveFolder": "1LHpxpobfuCgNVgplQp9STFpoBVW6Bqhu",
      "items": [
        { "client": "Co-op", "title": "Travel Insurance · The Co-op Way", "drive": "1oVH6taUEm2xmAU9GqVwOq5DUzLDu_zf-", "poster": "img/archive/co-op-the-co-op-way.webp", "length": 36 },
        { "client": "GoDaddy", "title": "Four Inch Freddies", "drive": "1ZHUDo0XXvjd5RKEncRDyzCU02Kr1eCXR", "poster": "img/archive/go-daddy-four-inch-freddies.webp", "length": 30 },
        { "client": "Knight Frank", "title": "Global Capital Markets", "drive": "1ASncxHeennH38HNVhw16NtotIRD6-stJ", "poster": "img/archive/knight-frank-capital-markets.webp", "length": 86 },
        { "client": "Knight Frank", "title": "Global Cities 2018", "drive": "1_PN0e4np447-NbCk9S-JJSgcZhyNZB0i", "poster": "img/archive/knight-frank-global-cities-2018.webp", "length": 59 },
        { "client": "Knight Frank", "title": "Global Cities", "drive": "1UbS3NkGXt7zoSjgOJHqKGWFgjiXaBvDc", "poster": "img/archive/knight-frank-global-cities.webp", "length": 85 },
        { "client": "MediCinema", "title": "All Forgotten", "drive": "1Gsl5kRl43JA6BGYumSyFvkiPCG9QpGZv", "poster": "img/archive/medicinema-all-forgotten.webp", "length": 94 },
        { "client": "Orange", "title": "Maersk", "drive": "18PoOs1cp5wi_VUH6u7IXL1vSphAst75C", "poster": "img/archive/orange-maersk.webp", "length": 155 },
        { "client": "Orange", "title": "Mobileye", "drive": "11z6z41b_Ez81T3oth_fmIavKgHXvYwEK", "poster": "img/archive/orange-mobileye.webp", "length": 163 },
        { "client": "Osprey", "title": "Autumn / Winter", "drive": "10d2XzQyNGCgf4NR5vtVKokHm0THI_Uth", "poster": "img/archive/osprey-autumn-winter.webp", "length": 66 },
        { "client": "Osprey", "title": "Spring / Summer", "drive": "1ubSbaXnwiXkzsaIM5hydCYe5p418L10A", "poster": "img/archive/osprey-spring-summer.webp", "length": 60 },
        { "client": "Raffaello", "title": "Product Film", "drive": "1fOCh6HUx-8jzW8NN4xAokaoWPZIf3xGm", "poster": "img/archive/raffaello-product-film.webp", "length": 10 },
        { "client": "Royal Academy of Arts", "title": "Inside the Show · Antony Gormley", "drive": "15wf3emwatLCfhS9p2ERmnQdIVcwWLh-m", "poster": "img/archive/ra-antony-gormley.webp", "length": 145 },
        { "client": "Simple", "title": "Ready to Play", "drive": "19FFNb1mIapD179-pTP9BEqpAEzp3TSUC", "poster": "img/archive/simple-ready-to-play.webp", "length": 20 },
        { "client": "Snazaroo", "title": "Magic Mum", "drive": "19hVAmdDDUQeUGr5p2VVN4PabBXI3wYDC", "poster": "img/archive/snazaroo-magic-mum.webp", "length": 79 },
        { "client": "Verizon", "title": "Your Journey to 5G", "drive": "1vNMjgs46gBtcnhJsE0sNwkT_-gKq_Q0G", "poster": "img/archive/verizon-journey-to-5g.webp", "length": 227 },
        { "client": "VR", "title": "Destination Marketing · Memories", "drive": "1gxN-txBsio_cdySo9G7Cth6G8yc_X-Qg", "poster": "img/archive/vr-destination-memories.webp", "length": 68, "year": "2020" }
      ]
    },
    {
      "id": "music",
      "title": "Music videos",
      "driveFolder": "1W-m6wP8xYNfZweD0Pi6-jO5zhKi6JfOW",
      "items": [
        { "client": "Hollie Cook", "title": "Dance in the Sunshine", "drive": "1My7pZTvZwV8AWRNBusqnVPNIGhymRUla", "poster": "img/archive/hollie-cook-dance-in-the-sunshine.webp", "length": 245 },
        { "client": "Maverick Sabre", "title": "Into Hope", "drive": "1mSsgjlLHZ07nn9xDw3e7V2M6LgO63s5z", "poster": "img/archive/maverick-sabre-into-hope.webp", "length": 245 },
        { "client": "The Snuts", "title": "Fatboy Slim", "drive": "1nqKq2Kt8UCNsK5FoF0b7OKtMg3OTLs8n", "poster": "img/archive/the-snuts-fatboy-slim.webp", "length": 206 }
      ]
    }
  ]
};

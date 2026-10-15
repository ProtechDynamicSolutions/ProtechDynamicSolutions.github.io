/*
  Everything on the site comes from this file.

  Each video needs one source. Use whichever the video lives on:
    drive:   'FILE_ID'      Google Drive file shared "anyone with the link"
    vimeo:   '123456789'    Vimeo video id (best for a showreel site)
    youtube: 'dQw4w9WgXcQ'  YouTube video id

  To add a project, copy one block in `latest` or `films`, change the words,
  point `poster` at a still in img/work/, and set the video source.
  The first item in `latest` is the big one at the top.
*/
window.SITE = {
  name: 'Peter J Duggan',
  role: 'Editor / Colourist / DIT',
  email: 'hello@peterjduggan.com',
  // Leave a link blank to hide its icon.
  links: {
    vimeo: '',
    instagram: '',
    linkedin: ''
  },
  // Where the "Older work" button goes. Blank hides the button.
  olderWorkUrl: '',

  hero: {
    image: 'img/hero.jpg',
    headline: 'I cut things up for a living*',
    disclaimer: '*Disclaimer: film only. I cut it, grade it and look after it on set. Never hair, never hedges and never in the queue at the bar.'
  },

  latest: [
    {
      client: 'Michelob ULTRA',
      title: 'Superior Match',
      type: 'Commercial',
      poster: 'img/work/michelob-longform.webp',
      cuts: [
        { label: 'Longform', drive: '10FTbhzQPL5aR4806XJvLy79FVooSQpyj', poster: 'img/work/michelob-longform.webp' },
        { label: '30"', drive: '1cZ5-MhIm0OEzpMRBE06LluTTbgkC0PZE', poster: 'img/work/michelob-olv-30.webp' },
        { label: 'Challenging Messi 15"', drive: '1p5-62lhvvdfYCy66WrpfLfhonlnizWA4', poster: 'img/work/michelob-messi-15.webp' },
        { label: 'The Lobby Nutmeg 15"', drive: '1HaC451AhZFQFKiUWRLhA68WVbRwjlFC6', poster: 'img/work/michelob-lobby-nutmeg-15.webp' },
        { label: 'Cutdown 15"', drive: '1FXrGyFmtW-eT4XkkMA-iuvYb1RtoCzjd', poster: 'img/work/michelob-cutdown-15.webp' },
        { label: 'Product 6"', drive: '16iH4McVE1d7M6CjXumakiTqXk96d8CaD', poster: 'img/work/michelob-product-6.webp' },
        { label: 'Social 9x16', drive: '1tM6rObVRjTJWM6DX54Ww75MvKIwjfn2L', poster: 'img/work/michelob-social-916.webp', vertical: true }
      ]
    },
    {
      client: 'Samsung',
      title: 'Galaxy Z Fold8',
      type: 'Commercial',
      poster: 'img/work/samsung-cxp-30.webp',
      cuts: [
        { label: 'Combo 30"', drive: '1Aw6l8esofmEmKw80MaYjXJ1YwQsXJ8o8', poster: 'img/work/samsung-cxp-30.webp' },
        { label: 'Hardware 30"', drive: '12QIjD2bWStUxvQyttWKLmwutqdZHIWGU', poster: 'img/work/samsung-hardware-30.webp' },
        { label: 'Content Native 30"', drive: '17ocTvV5RqRkPPVM8gX0GIEKnaGdS0UbN', poster: 'img/work/samsung-content-native-30.webp' },
        { label: 'My FanCam 30"', drive: '1i1KfHq8YWpVT6e9JemPrO2jpJqdKKiTj', poster: 'img/work/samsung-my-fancam-30.webp' },
        { label: 'Now Nudge 15"', drive: '1hlwcmWPbvn7uGMHzY970TX4RRCGbntzM', poster: 'img/work/samsung-now-nudge-15.webp' }
      ]
    },
    {
      client: 'Lynx',
      title: "Hot Since '95",
      type: 'Commercial',
      credit: 'Anthony Joshua & Calfreezy',
      poster: 'img/work/lynx-hot-since-95.webp',
      cuts: [
        { label: 'Film', drive: '1x4vHfBlrAPPQDpUV5twefdKKrtNyQgvk', poster: 'img/work/lynx-hot-since-95.webp' }
      ]
    },
    {
      client: 'Enterprise x UEFA',
      title: 'Rent a Player',
      type: 'Series',
      poster: 'img/work/enterprise-ep1.webp',
      cuts: [
        { label: 'Episode 1', drive: '1tOptV_x-bMwkTZSfmQFIvwealaH_ohE4', poster: 'img/work/enterprise-ep1.webp' },
        { label: 'Episode 2', drive: '1JtTbqkW1rfoz_EET3jlT2ruZwiDZCh1F', poster: 'img/work/enterprise-ep2.webp' },
        { label: 'Episode 3', drive: '1W9sA46l8o9SrUSa7kejFVWscHmQLPrBN', poster: 'img/work/enterprise-ep3.webp' }
      ]
    },
    {
      client: "Chili's",
      title: 'Cannes',
      type: 'Film',
      poster: 'img/work/chilis-cannes.webp',
      cuts: [
        { label: 'Film', drive: '1q6iSvlNi__N2PtmglkaVLkf2Iz7jZUXc', poster: 'img/work/chilis-cannes.webp' }
      ]
    }
  ],

  films: [
    {
      client: "Kensuke's Kingdom",
      title: 'Official Trailer',
      type: 'Trailer',
      poster: 'img/work/kensukes-kingdom.webp',
      cuts: [{ label: 'Trailer', drive: '19ciMO1o6jHcCfxMolysQZEWs23EPPb78', poster: 'img/work/kensukes-kingdom.webp' }]
    },
    {
      client: 'Mog',
      title: 'Trailer',
      type: 'Trailer',
      poster: 'img/work/mog-trailer.webp',
      cuts: [{ label: 'Trailer', drive: '1jljlfgOpLt1oYLaWlKPuV1E1HZfGTBqF', poster: 'img/work/mog-trailer.webp' }]
    },
    {
      client: 'Channel 4',
      title: 'Spot',
      type: 'Promo',
      poster: 'img/work/channel-4-spot.webp',
      cuts: [{ label: 'Spot', drive: '1qE5N0_AHyf_qaagJjJWLhafFyBzK_i6I', poster: 'img/work/channel-4-spot.webp' }]
    },
    {
      client: 'Hamsbury Book Club',
      title: 'Short',
      type: 'Film',
      poster: 'img/work/hamsbury-book-club.webp',
      cuts: [{ label: 'Film', drive: '1QPmGhTKK-tDBpoaX-mYrCkQs9rNl_wGF', poster: 'img/work/hamsbury-book-club.webp' }]
    }
  ],

  // Empty for now; the section appears as soon as one is added.
  musicVideos: [],

  laurels: [
    { name: 'International Emmy Award winner', src: 'img/laurels/international-emmy-winner.webp' },
    { name: 'BAFTA nominee, Children\'s', src: 'img/laurels/bafta-nominee.webp' },
    { name: 'Annecy jury award for a TV special', src: 'img/laurels/annecy-jury-award.webp' },
    { name: 'British Animation Awards winner', src: 'img/laurels/british-animation-awards-winner.webp' },
    { name: 'LSFF', src: 'img/laurels/lsff.webp', badge: true }
  ],

  broadcasters: [
    ['Apple TV', 'apple-tv'], ['BBC', 'bbc'], ['BFI', 'bfi'], ['Channel 4', 'channel-4'], ['Canal+', 'canal-plus'],
    ['Netflix', 'netflix'], ['ITV', 'itv'], ['Disney Junior', 'disney-junior'], ['Channel 5', 'channel-5'], ['france.tv', 'france-tv'],
    ['RTÉ', 'rte'], ['Cartoonito', 'cartoonito'], ['WDR', 'wdr'], ['S4C', 's4c'], ['KiKA', 'kika']
  ],

  brands: [
    ['Samsung', 'samsung'], ['Red Bull', 'red-bull'], ['Coca-Cola', 'coca-cola'], ['Mercedes-Benz', 'mercedes-benz'],
    ['Ferrari', 'ferrari'], ['BMW', 'bmw'], ['Volkswagen', 'volkswagen'], ['Visa', 'visa'], ['Pepsi', 'pepsi'],
    ['Toyota', 'toyota'], ['Honda', 'honda'], ['Hyundai', 'hyundai'], ['Kia', 'kia'], ['Renault', 'renault'],
    ['Verizon', 'verizon'], ['EE', 'ee'], ['Orange', 'orange'], ['Nokia', 'nokia'], ['TNT Sports', 'tnt-sports'],
    ['Yahoo', 'yahoo'], ['GoDaddy', 'godaddy'], ['Fendi', 'fendi'], ['Emporio Armani', 'emporio-armani'],
    ['Vivienne Westwood', 'vivienne-westwood'], ['Anya Hindmarch', 'anya-hindmarch'], ['Veuve Clicquot', 'veuve-clicquot'],
    ['Courvoisier', 'courvoisier'], ['Diageo', 'diageo'], ['Magners', 'magners'], ['Asics', 'asics'], ['Head', 'head'],
    ['Wrangler', 'wrangler'], ['Aldo', 'aldo'], ['Moleskine', 'moleskine'], ['Tate', 'tate'],
    ['The National Gallery', 'national-gallery'], ['Royal Academy of Arts', 'royal-academy'], ['National Trust', 'national-trust'],
    ['The Bicester Collection', 'bicester-collection'], ['John Lewis', 'john-lewis'], ['Debenhams', 'debenhams'],
    ['Co-op', 'co-op'], ['Royal Mail', 'royal-mail'], ['Dove', 'dove'], ['Simple', 'simple'], ['Nestlé', 'nestle'],
    ['Raffaello', 'raffaello'], ['Gaviscon', 'gaviscon'], ['GSK', 'gsk'], ['VO5', 'vi05'], ['Veganz', 'veganz'],
    ['Eve', 'eve'], ['Weight Watchers', 'weightwatchers'], ['Goldman Sachs', 'goldman-sachs'],
    ['Morgan Stanley', 'morgan-stanley'], ['Credit Suisse', 'credit-suisse'], ['Korn Ferry', 'korn-ferry'],
    ['Knight Frank', 'knight-frank'], ['Landsec', 'landsec'], ['British Land', 'british-land'],
    ['Barratt Homes', 'barratt-homes'], ['Babcock', 'babcock'], ['EDF', 'edf'], ['Avios', 'avios'],
    ['lastminute.com', 'lastminute'], ['Riviera Travel', 'riviera-travel'], ['jobs.ch', 'jobs-ch'],
    ['Moneypenny', 'moneypenny'], ['Gazi', 'gazi'], ['NSPCC', 'nspcc'], ['Age UK', 'age-uk'],
    ['Bobby Moore Fund', 'bobby-moore-fund']
  ],

  // The giant line on the landing page, one entry per line. The second line
  // sits over the bottom edge of the photo card, the first over the top.
  heroLines: ['Who you', 'gonna call?'],

  // Movie taglines that scroll across the strip under the landing page: [line, film].
  taglines: [
    ['Escape or die frying.', 'Chicken Run'],
    ['On the air and unaware.', 'The Truman Show'],
    ['Work sucks.', 'Office Space'],
    ['The true story of a real fake.', 'Catch Me If You Can'],
    ['For Harry and Lloyd, every day is a no-brainer.', 'Dumb and Dumber'],
    ['He may be dead but he’s the life of the party.', 'Weekend at Bernie’s'],
    ['If you only see one movie this year… you need to get out more often.', 'The Naked Gun'],
    ['From the brother of the director of Ghost.', 'Naked Gun 33⅓']
  ],

  // The quote above CUT. GRADE. DELIVER. in the About section: [line, film].
  aboutLine: ['One man’s struggle to take it easy.', 'Ferris Bueller’s Day Off'],

  // One line under the laurels. The name is set in bold.
  intro: 'Peter J Duggan is an editor, colourist and DIT for commercials, trailers, spots and films, working with brands, agencies and broadcasters.',

  about: [
    'Peter J Duggan is an editor, colourist and DIT. He cuts and grades commercials, trailers, spots and films for brands, agencies and broadcasters, and on set he looks after the camera data and the look.',
    'Recent work includes Michelob ULTRA, Samsung Galaxy Z Fold8, Lynx with Anthony Joshua and Calfreezy, and Enterprise x UEFA.'
  ]
};

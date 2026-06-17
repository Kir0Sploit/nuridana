/* =====================================================================
   data.js — Palette, world data, and the complete narrative.
   All story text follows the project rules:
   no begging, no guilt-tripping, no "I'm perfect now", honest & mature.
   ===================================================================== */

/* ---------- Color palette (used by procedural pixel rendering) ---------- */
window.COLORS = {
  // environment
  grassDark:  '#4f8a3f',
  grass:      '#6bab4d',
  grassLight: '#8fce63',
  grassHi:    '#b6e587',
  path:       '#cba37a',
  pathLight:  '#e0c98f',
  pathDark:   '#a8854f',
  water:      '#4aa6d0',
  waterLight: '#8fd6ea',
  trunk:      '#7a5230',
  trunkDark:  '#553418',
  leafDark:   '#2f7a3a',
  leaf:       '#46a64f',
  leafLight:  '#7cd06a',
  rock:       '#9a9aa6',
  rockDark:   '#6a6a78',
  bush:       '#3f8a44',
  bushHi:     '#69b95f',

  // sky tints per chapter
  skyDayTop:    '#bfe9ff',
  skyDayBot:    '#a6d977',
  skySunsetTop: '#5b2b6b',
  skySunsetBot: '#f3a85a',
  skyNightTop:  '#161334',
  skyNightBot:  '#2e2a55',
  skyStormTop:  '#2a2738',
  skyStormBot:  '#4a4760',

  // characters
  skin:      '#f1c79b',
  skinShade: '#d29a68',
  // Nuridana
  nuriHair:  '#3a2a22',
  nuriHairHi:'#5a4030',
  nuriDress: '#ef6f9a',
  nuriDressD:'#c84a78',
  // Musaab
  musHair:   '#241c28',
  musShirt:  '#5a78c8',
  musShirtD: '#3a548f',
  // Gardener
  gardRobe:  '#6f8f5a',
  gardRobeD: '#4f6a3e',
  gardBeard: '#e4e0d4',

  // misc
  white:   '#fdf6e3',
  black:   '#241b2f',
  shadow:  'rgba(20,12,30,0.30)',
  gold:    '#ffd266',
  goldD:   '#d99a3a',
  red:     '#e8556a',
  orange:  '#ef8f43',
  yellow:  '#f6d34a',
  purple:  '#9a6bd0',
  pink:    '#f48fb1',
  pinkHi:  '#ffd0e0',
  brown:   '#9b6a3a',
  glass:   '#cfe9ff',
  thought: '#3a2f4f',
  thoughtHi:'#6a5a8f',
  ember:   '#ffcf7a'
};

/* ---------- Chapter ambience -> sky gradient + particle profile ---------- */
window.AMBIENCE = {
  day:    { top: COLORS.skyDayTop,    bot: COLORS.skyDayBot,    fireflies: false, birds: true,  petals: true  },
  sunset: { top: COLORS.skySunsetTop, bot: COLORS.skySunsetBot, fireflies: false, birds: true,  petals: true  },
  night:  { top: COLORS.skyNightTop,  bot: COLORS.skyNightBot,  fireflies: true,  birds: false, petals: false },
  storm:  { top: COLORS.skyStormTop,  bot: COLORS.skyStormBot,  fireflies: false, birds: false, petals: false }
};

/* ---------- Opening sequence ---------- */
window.INTRO = [
  { name: '', text: 'A soft wind moves through a garden that should not exist...', sfx: 'wind' },
  { name: '', text: 'You open your eyes.' },
  { name: 'Nuridana', text: 'My name feels familiar... but I cannot remember everything.' },
  { name: 'Nuridana', text: 'Where am I? Why is everything so quiet and warm?' },
  { name: 'Old Gardener', text: 'Ah. Another traveller, woken by the flowers.' },
  { name: 'Old Gardener', text: 'This is a memory garden. The things you have forgotten took root here long ago.' },
  { name: 'Nuridana', text: 'Forgotten? I don\'t even know who I am.' },
  { name: 'Old Gardener', text: 'You know a little. You know your name is Nuridana. That is enough to begin.' },
  { name: 'Old Gardener', text: 'If you wish to remember who you are, follow the memories scattered throughout this garden.' },
  { name: 'Old Gardener', text: 'Walk to the glowing places. Each one holds a piece of you.' },
  { name: 'Old Gardener', text: 'Take your time. No one is rushing you here.' },
  { name: 'Nuridana', text: '...Alright. I\'ll go and find them.' }
];

/* ---------- The 8 checkpoints ---------- */
window.CHECKPOINTS = [
  /* ============ 1 ============ */
  {
    id: 1,
    chapter: 'Chapter One',
    title: 'The Forgotten Appetite',
    ambience: 'day',
    task: 'Gather the flavours that feel like comfort.',
    intro: [
      { name: 'Old Gardener', text: 'The first memory smells of warm food. Funny, how taste outlives so much else.' },
      { name: 'Nuridana', text: 'Food? That seems... small.' },
      { name: 'Old Gardener', text: 'Small things are where people keep their happiness. Go on. Collect what feels like home.' }
    ],
    mode: 'collect',
    collect: { interact: false, perItemMessage: false,
      items: [
        { label: 'Ayam Gepuk',     icon: 'rice'   },
        { label: 'Mee Celup',      icon: 'noodle' },
        { label: 'Sukiya',         icon: 'bowl'   },
        { label: 'Zus Coffee',     icon: 'coffee' },
        { label: 'Baskin Robbins', icon: 'icecream'},
        { label: 'Inside Scoop',   icon: 'scoop'  }
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'Oh... I remember these. The smell, the little arguments over the last bite.' },
      { name: 'Nuridana', text: 'I always smile when food tastes like comfort.' }
    ],
    memory: { icon: '🍜', title: 'Memory: Comfort', quote: 'I always smile when food tastes like comfort.' }
  },

  /* ============ 2 ============ */
  {
    id: 2,
    chapter: 'Chapter Two',
    title: "The Friend's Staycation",
    ambience: 'day',
    task: 'Help set up a picnic for friends. Find the four picnic things.',
    intro: [
      { name: 'Old Gardener', text: 'Listen. Laughter that isn\'t yours, and that\'s alright.' },
      { name: 'Nuridana', text: 'There were friends. A little trip. I almost feel guilty for the joy of it.' },
      { name: 'Old Gardener', text: 'Why guilty? Help them set the table. You\'ll see.' }
    ],
    mode: 'collect',
    collect: { interact: false, perItemMessage: true,
      items: [
        { label: 'Picnic blanket', icon: 'blanket', msg: 'A place to simply sit and be.' },
        { label: 'Basket',         icon: 'basket',  msg: 'Enough to share, with no one keeping count.' },
        { label: 'Fresh fruit',    icon: 'fruit',   msg: 'Sweet things taste better in good company.' },
        { label: 'Lemonade',       icon: 'drink',   msg: 'Cold drinks, warm afternoon.' }
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'They were so happy. And it had nothing to do with me being there or not.' },
      { name: 'Old Gardener', text: 'Love is not possession. People are allowed quiet moments of their own.' },
      { name: 'Nuridana', text: 'Someone who cares for me should also respect my space.' }
    ],
    memory: { icon: '🧺', title: 'Memory: Space', quote: 'Someone who cares for me should also respect my space.' }
  },

  /* ============ 3 ============ */
  {
    id: 3,
    chapter: 'Chapter Three',
    title: 'The Storm of Thoughts',
    ambience: 'storm',
    task: 'Find the calm light on the far side. Not every thought is true.',
    intro: [
      { name: 'Old Gardener', text: 'This path is darker. The clouds here are made of thinking.' },
      { name: 'Nuridana', text: 'I know this feeling. The way my mind builds storms out of nothing.' },
      { name: 'Old Gardener', text: 'Walk through them. They will whisper. Let them. Then keep walking.' }
    ],
    mode: 'maze',
    maze: {
      cols: 13, rows: 11,
      thoughts: [
        'What if everything goes wrong?',
        "What if I'm not enough?",
        'What if they leave the moment I rest?',
        'What if I imagined all the good parts?'
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'They felt so loud. But they were only thoughts, not facts.' },
      { name: 'Old Gardener', text: 'A thought can visit without being invited to stay.' },
      { name: 'Nuridana', text: 'Not every thought I have is the truth.' }
    ],
    memory: { icon: '🌧️', title: 'Memory: Calm', quote: 'Not every thought I have is the truth.' }
  },

  /* ============ 4 ============ */
  {
    id: 4,
    chapter: 'Chapter Four',
    title: 'The Bus Journey',
    ambience: 'sunset',
    task: 'Catch the memory fragments drifting past the window.',
    intro: [
      { name: 'Old Gardener', text: 'Here comes a bus, of all things. Climb aboard.' },
      { name: 'Nuridana', text: 'Someone rode a long way on a bus like this. For hours.' },
      { name: 'Old Gardener', text: 'Watch the window. Their thoughts drifted past the whole ride.' }
    ],
    mode: 'runner',
    runner: {
      need: 6,
      fragments: [
        'He counted the stops so he would not miss it.',
        'He practiced what to say, then forgot most of it.',
        'He was tired, but he kept his eyes on the road.',
        'He wondered if showing up was enough.',
        'He brought nothing fancy. Just himself.',
        'He thought: I hope today I do better than before.'
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'It wasn\'t about the distance. It was about choosing to come at all.' },
      { name: 'Old Gardener', text: 'Effort means little when it\'s loud. It means everything when it\'s sincere.' },
      { name: 'Nuridana', text: 'Sincere effort is its own kind of language.' }
    ],
    memory: { icon: '🚌', title: 'Memory: Effort', quote: 'Sincere effort is its own kind of language.' }
  },

  /* ============ 5 ============ */
  {
    id: 5,
    chapter: 'Chapter Five',
    title: 'The Golden Promise',
    ambience: 'sunset',
    task: 'Open each gift. Look past the wrapping.',
    intro: [
      { name: 'Old Gardener', text: 'Three gifts sit here, waiting. Open them. But look closely.' },
      { name: 'Nuridana', text: 'Gifts. I remember being given things. I never knew how to feel about it.' },
      { name: 'Old Gardener', text: 'Then open them slowly. The wrapping is never the point.' }
    ],
    mode: 'collect',
    collect: { interact: true, perItemMessage: true,
      items: [
        { label: 'A small box',   icon: 'gift', msg: 'Inside: a note. "I saw this and thought of you."' },
        { label: 'A folded card', icon: 'gift', msg: 'Inside: "Sorry I am clumsy with words. I am trying."' },
        { label: 'A worn ribbon', icon: 'gift', msg: 'Inside: nothing expensive. Only attention, saved up and given.' }
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'None of them mattered for their price.' },
      { name: 'Old Gardener', text: 'The most valuable thing was never the gift. It was the intention behind it.' },
      { name: 'Nuridana', text: 'I was given attention disguised as objects.' }
    ],
    memory: { icon: '🎁', title: 'Memory: Intention', quote: 'The most valuable thing was never the gift. It was the intention behind it.' }
  },

  /* ============ 6 ============ */
  {
    id: 6,
    chapter: 'Chapter Six',
    title: 'The Broken Mirror',
    ambience: 'night',
    task: 'Gather the broken pieces. Do not look away from them.',
    intro: [
      { name: 'Old Gardener', text: 'This room holds the memories most people bury.' },
      { name: 'Nuridana', text: 'I can feel it before I see it. This is where it hurt.' },
      { name: 'Old Gardener', text: 'Yes. There were good days. There were also these. Both are real.' }
    ],
    mode: 'collect',
    collect: { interact: false, perItemMessage: true, dark: true,
      items: [
        { label: 'A raised voice', icon: 'shard', msg: 'He let his anger speak before his patience could.' },
        { label: 'A cold silence', icon: 'shard', msg: 'He went quiet when he should have stayed and talked.' },
        { label: 'A careless word', icon: 'shard', msg: 'He said something sharp and watched it land.' },
        { label: 'A broken plan',   icon: 'shard', msg: 'He promised, then let it slip. More than once.' }
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'So it wasn\'t all soft and golden. He hurt me. That part was true too.' },
      { name: '', text: 'Love cannot grow where pain is ignored.' },
      { name: 'Nuridana', text: 'I am allowed to hold both the warmth and the wound.' }
    ],
    memory: { icon: '🪞', title: 'Memory: Honesty', quote: 'Love cannot grow where pain is ignored.' }
  },

  /* ============ 7 ============ */
  {
    id: 7,
    chapter: 'Chapter Seven',
    title: 'The Path Forward',
    ambience: 'sunset',
    task: 'Rebuild the four bridges. Stand on each gap and build.',
    intro: [
      { name: 'Old Gardener', text: 'The way ahead is broken into pieces. Bridges, fallen long ago.' },
      { name: 'Nuridana', text: 'Can broken things really be rebuilt?' },
      { name: 'Old Gardener', text: 'Not in one grand gesture. Plank by plank. Day by day.' }
    ],
    mode: 'bridge',
    bridge: {
      planks: [
        { label: 'Patience' },
        { label: 'Communication' },
        { label: 'Trust' },
        { label: 'Consistency' }
      ]
    },
    outro: [
      { name: 'Nuridana', text: 'Patience. Communication. Trust. Consistency. None of them are loud.' },
      { name: 'Old Gardener', text: 'Growth is not proving you\'ve changed once. It is choosing better every day.' },
      { name: 'Nuridana', text: 'A bridge is only as strong as the days you keep crossing it.' }
    ],
    memory: { icon: '🌉', title: 'Memory: Growth', quote: 'Growth is not proving you\'ve changed once. It is choosing better every day.' }
  },

  /* ============ 8 ============ */
  {
    id: 8,
    chapter: 'Chapter Eight',
    title: 'The Final Garden',
    ambience: 'sunset',
    task: 'Walk to the top of the hill.',
    intro: [
      { name: 'Old Gardener', text: 'You remember now. Most of it, anyway.' },
      { name: 'Nuridana', text: 'I do. I know who I am. And I know I wasn\'t imagining the good parts.' },
      { name: 'Old Gardener', text: 'Someone has been quietly searching for you. He\'s at the top of the hill.' },
      { name: 'Old Gardener', text: 'Go, if you want to. Or don\'t. The choice was always yours.' }
    ],
    mode: 'final',
    final: {
      convo: [
        { name: 'Musaab', text: 'You\'re here. I wasn\'t sure you would be.' },
        { name: 'Nuridana', text: 'Neither was I.' },
        { name: 'Musaab', text: 'I spent a long time looking for answers.' },
        { name: 'Nuridana', text: 'Did you find them?' },
        { name: 'Musaab', text: 'Not all of them.' },
        { name: 'Musaab', text: '...' },
        { name: 'Musaab', text: 'But I found something important.' },
        { name: 'Nuridana', text: 'What is it?' },
        { name: 'Musaab', text: 'That caring for someone means learning every day how to care for them better.' },
        { name: 'Musaab', text: 'I got a lot wrong. I\'m not going to pretend I didn\'t.' },
        { name: 'Musaab', text: 'Some people hurt the ones they love before they learn how precious they are.' },
        { name: 'Musaab', text: 'I\'m still learning. But I\'m here, and I\'m paying attention now.' },
        { name: 'Nuridana', text: 'That\'s all I ever really wanted. To be paid attention to.' }
      ],
      choices: [
        { label: 'Sit together and watch the sunset', value: 'sit' },
        { label: 'Take a walk through the garden',     value: 'walk' },
        { label: 'Keep exploring the world a while',    value: 'explore' }
      ],
      endings: {
        sit:     'You sat side by side as the sky turned gold, saying very little. Some silences are full.',
        walk:    'You walked the garden paths together, naming the flowers, in no hurry to arrive anywhere.',
        explore: 'You smiled and wandered ahead. He followed at your pace, content to simply be allowed along.'
      }
    },
    outro: [],
    memory: { icon: '🌅', title: 'Memory: Yourself', quote: 'You are not what you forgot. You are everything you chose to remember.' }
  }
];

/* ---------- Secret collectibles (hidden in the overworld) ---------- */
window.SECRETS = [
  { id: 's1', icon: '😄', title: 'The First Laugh',     quote: 'The laugh that escaped before either of you meant it to.' },
  { id: 's2', icon: '🥤', title: 'The Favourite Drink', quote: 'Iced, too sweet, ordered the same way every single time.' },
  { id: 's3', icon: '🌙', title: 'A Random 2AM Talk',   quote: 'Tired, honest, half-asleep, and somehow the most real.' },
  { id: 's4', icon: '😂', title: 'The Inside Joke',      quote: 'Three words that mean nothing to anyone else on earth.' },
  { id: 's5', icon: '🐱', title: 'The Cat Detour',       quote: 'You both stopped everything for one small unbothered cat.' }
];

/* ---------- Album closing note (shown when everything is found) ---------- */
window.ALBUM_COMPLETE_NOTE =
  'Every memory found. You are not what you forgot — you are everything you chose to remember.';

window.GARDENER_HINTS = [
  'Walk to the glowing markers. Each one is a memory waiting.',
  'Some memories are hidden off the path. Wander a little.',
  'There is no failing here. Only remembering, slowly.'
];

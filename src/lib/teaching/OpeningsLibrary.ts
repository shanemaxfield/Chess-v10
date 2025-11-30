/**
 * OpeningsLibrary - Hardcoded shortcuts for the 20 most common chess openings
 *
 * Provides instant responses for opening demonstration requests
 * Each opening includes: main line, variations, descriptions, and ECO codes
 */

export interface OpeningContinuation {
  name: string;
  moves: string[]; // SAN notation
  description: string;
  source: 'stockfish' | 'theory' | 'common'; // Source attribution
  evaluation?: string; // e.g., "+0.3", "=", "-0.5"
}

export interface ChessOpening {
  name: string;
  ecoCode: string; // ECO classification
  aliases: string[]; // Alternative names
  mainLine: string[]; // Main line moves in SAN
  description: string;
  continuations: OpeningContinuation[]; // Up to 3 continuations
  keywords: string[]; // For search/matching
}

export const OPENINGS_DATABASE: ChessOpening[] = [
  {
    name: 'Italian Game',
    ecoCode: 'C50',
    aliases: ['Giuoco Piano', 'Italian Opening'],
    mainLine: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'One of the oldest openings, aiming for rapid development and central control. White develops the bishop to an aggressive square, preparing castling.',
    keywords: ['italian', 'giuoco', 'piano', 'bc4'],
    continuations: [
      {
        name: 'Classical Variation',
        moves: ['Bc5', 'd3', 'Nf6'],
        description: 'The main theoretical line. Black mirrors White\'s development.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Two Knights Defense',
        moves: ['Nf6'],
        description: 'Black develops the knight first, leading to sharp tactical play.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Evans Gambit',
        moves: ['Bc5', 'b4'],
        description: 'Aggressive gambit sacrificing a pawn for rapid development.',
        source: 'common',
        evaluation: '+0.2',
      },
    ],
  },
  {
    name: 'Spanish Opening (Ruy Lopez)',
    ecoCode: 'C60',
    aliases: ['Ruy Lopez', 'Spanish Game'],
    mainLine: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: 'The most popular 1.e4 e5 opening. White puts pressure on the e5 pawn and develops rapidly.',
    keywords: ['spanish', 'ruy', 'lopez', 'bb5'],
    continuations: [
      {
        name: 'Morphy Defense',
        moves: ['a6', 'Ba4', 'Nf6'],
        description: 'The main line of the Ruy Lopez, leading to rich strategic play.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Berlin Defense',
        moves: ['Nf6'],
        description: 'Solid defense popularized by Kramnik, leading to endgames.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Steinitz Defense',
        moves: ['d6'],
        description: 'Solid but passive defense, maintaining the e5 pawn.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Sicilian Defense',
    ecoCode: 'B20',
    aliases: ['Sicilian'],
    mainLine: ['e4', 'c5'],
    description: 'The most popular defense to 1.e4. Black fights for the center asymmetrically, leading to imbalanced positions.',
    keywords: ['sicilian', 'c5'],
    continuations: [
      {
        name: 'Open Sicilian',
        moves: ['Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
        description: 'The main line where White opens the center.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Closed Sicilian',
        moves: ['Nc3'],
        description: 'Positional approach, keeping the center closed.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Alapin Variation',
        moves: ['c3'],
        description: 'White prepares d4 to challenge Black\'s pawn structure.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'French Defense',
    ecoCode: 'C00',
    aliases: ['French'],
    mainLine: ['e4', 'e6'],
    description: 'A solid defense leading to closed positions. Black prepares d5 to challenge White\'s center.',
    keywords: ['french', 'e6'],
    continuations: [
      {
        name: 'Advance Variation',
        moves: ['d4', 'd5', 'e5'],
        description: 'White gains space but Black gets counterplay on the queenside.',
        source: 'theory',
        evaluation: '+0.3',
      },
      {
        name: 'Exchange Variation',
        moves: ['d4', 'd5', 'exd5', 'exd5'],
        description: 'Symmetrical structure, often leads to draws.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Winawer Variation',
        moves: ['d4', 'd5', 'Nc3', 'Bb4'],
        description: 'Sharp tactical line with doubled pawns and bishop pair.',
        source: 'theory',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Caro-Kann Defense',
    ecoCode: 'B10',
    aliases: ['Caro-Kann', 'Caro'],
    mainLine: ['e4', 'c6'],
    description: 'A solid defense similar to the French, but Black\'s light-squared bishop remains active.',
    keywords: ['caro', 'kann', 'c6'],
    continuations: [
      {
        name: 'Classical Variation',
        moves: ['d4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
        description: 'Main line where Black develops the bishop outside the pawn chain.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Advance Variation',
        moves: ['d4', 'd5', 'e5'],
        description: 'White gains space in the center.',
        source: 'common',
        evaluation: '+0.2',
      },
      {
        name: 'Exchange Variation',
        moves: ['d4', 'd5', 'exd5', 'cxd5'],
        description: 'Simple development, often leads to quiet positions.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: "Queen's Gambit",
    ecoCode: 'D06',
    aliases: ['Queens Gambit', 'QGD', 'QGA'],
    mainLine: ['d4', 'd5', 'c4'],
    description: 'One of the oldest and most respected openings. White offers a pawn to gain central control.',
    keywords: ['queen', 'gambit', 'qg', 'c4', 'd4 d5'],
    continuations: [
      {
        name: "Queen's Gambit Declined",
        moves: ['e6'],
        description: 'Black maintains the d5 pawn, leading to solid positions.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: "Queen's Gambit Accepted",
        moves: ['dxc4'],
        description: 'Black accepts the gambit pawn, White gains center control.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Slav Defense',
        moves: ['c6'],
        description: 'Black supports d5 with the c-pawn, keeping options open.',
        source: 'theory',
        evaluation: '=',
      },
    ],
  },
  {
    name: "King's Indian Defense",
    ecoCode: 'E60',
    aliases: ['KID', 'Kings Indian'],
    mainLine: ['d4', 'Nf6', 'c4', 'g6'],
    description: 'A hypermodern defense where Black allows White a strong center, then attacks it.',
    keywords: ['king', 'indian', 'kid', 'g6', 'nf6'],
    continuations: [
      {
        name: 'Classical Variation',
        moves: ['Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'],
        description: 'Main line with fianchettoed bishop and kingside attack.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Sämisch Variation',
        moves: ['Nc3', 'Bg7', 'e4', 'd6', 'f3'],
        description: 'Aggressive setup with f3 controlling the center.',
        source: 'common',
        evaluation: '+0.3',
      },
      {
        name: 'Four Pawns Attack',
        moves: ['Nc3', 'Bg7', 'e4', 'd6', 'f4'],
        description: 'Ultra-aggressive with four center pawns.',
        source: 'common',
        evaluation: '+0.2',
      },
    ],
  },
  {
    name: 'Nimzo-Indian Defense',
    ecoCode: 'E20',
    aliases: ['Nimzo-Indian', 'Nimzo'],
    mainLine: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    description: 'A hypermodern opening where Black pins the knight and fights for central control.',
    keywords: ['nimzo', 'indian', 'bb4', 'e6'],
    continuations: [
      {
        name: 'Classical Variation',
        moves: ['Qc2'],
        description: 'Main line preventing doubled pawns.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Rubinstein Variation',
        moves: ['e3'],
        description: 'Solid setup preparing Bd3 and Nge2.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Leningrad Variation',
        moves: ['Bg5'],
        description: 'Aggressive approach developing the bishop actively.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'English Opening',
    ecoCode: 'A10',
    aliases: ['English'],
    mainLine: ['c4'],
    description: 'A flexible opening that can transpose to many different structures.',
    keywords: ['english', 'c4'],
    continuations: [
      {
        name: 'Symmetrical Variation',
        moves: ['c5'],
        description: 'Black mirrors White\'s opening move.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'King\'s English',
        moves: ['e5'],
        description: 'Black claims central space immediately.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Anglo-Indian',
        moves: ['Nf6'],
        description: 'Flexible development, keeping options open.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Scotch Game',
    ecoCode: 'C45',
    aliases: ['Scotch', 'Scotch Opening'],
    mainLine: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    description: 'An aggressive opening where White immediately challenges the center.',
    keywords: ['scotch', 'd4 early'],
    continuations: [
      {
        name: 'Scotch Game Main Line',
        moves: ['exd4', 'Nxd4'],
        description: 'Open position with active piece play.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Scotch Gambit',
        moves: ['exd4', 'Bc4'],
        description: 'Gambit approach sacrificing a pawn for development.',
        source: 'common',
        evaluation: '+0.2',
      },
      {
        name: 'Classical Defense',
        moves: ['exd4', 'Nxd4', 'Bc5'],
        description: 'Solid development with the bishop.',
        source: 'theory',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'London System',
    ecoCode: 'D02',
    aliases: ['London'],
    mainLine: ['d4', 'd5', 'Bf4'],
    description: 'A solid system-based opening where White develops the bishop to f4 early.',
    keywords: ['london', 'bf4', 'system'],
    continuations: [
      {
        name: 'Standard Setup',
        moves: ['Nf6', 'e3', 'e6', 'Nf3'],
        description: 'Standard London setup with solid pawn structure.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Accelerated London',
        moves: ['Nf6', 'Nf3', 'c5'],
        description: 'Quick development with early challenge to center.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Anti-London',
        moves: ['Nf6', 'Nf3', 'c5'],
        description: 'Black challenges the setup immediately.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Najdorf Sicilian',
    ecoCode: 'B90',
    aliases: ['Najdorf', 'Sicilian Najdorf'],
    mainLine: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    description: 'The sharpest variation of the Sicilian Defense, favored by Fischer and Kasparov.',
    keywords: ['najdorf', 'sicilian', 'a6'],
    continuations: [
      {
        name: 'English Attack',
        moves: ['Be3', 'e5', 'Nb3'],
        description: 'Modern approach with Be3 and f3, preparing kingside storm.',
        source: 'theory',
        evaluation: '+0.3',
      },
      {
        name: 'Classical Variation',
        moves: ['Be2'],
        description: 'Solid development preparing castling.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Poisoned Pawn',
        moves: ['Bg5', 'e6', 'f4', 'Qb6'],
        description: 'Sharp tactical line where Black grabs the b2 pawn.',
        source: 'theory',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Dragon Sicilian',
    ecoCode: 'B70',
    aliases: ['Dragon', 'Sicilian Dragon'],
    mainLine: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
    description: 'Named after the pawn structure resembling a dragon. Leads to sharp attacking positions.',
    keywords: ['dragon', 'sicilian', 'g6', 'fianchetto'],
    continuations: [
      {
        name: 'Yugoslav Attack',
        moves: ['Be3', 'Bg7', 'f3', 'O-O', 'Qd2'],
        description: 'The main theoretical line with opposite-side castling and mutual attacks.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Classical Dragon',
        moves: ['Be2', 'Bg7', 'O-O', 'O-O'],
        description: 'Positional approach with same-side castling.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Accelerated Dragon',
        moves: ['Bg7', 'Nc3', 'Nc6'],
        description: 'Early g6 without d6, saving a tempo.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Slav Defense',
    ecoCode: 'D10',
    aliases: ['Slav'],
    mainLine: ['d4', 'd5', 'c4', 'c6'],
    description: 'A solid defense to the Queen\'s Gambit, keeping the light-squared bishop free.',
    keywords: ['slav', 'c6', 'd5'],
    continuations: [
      {
        name: 'Main Line Slav',
        moves: ['Nf3', 'Nf6', 'Nc3', 'dxc4'],
        description: 'The main theoretical line.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Exchange Slav',
        moves: ['cxd5', 'cxd5'],
        description: 'Symmetrical structure, often drawish.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Semi-Slav',
        moves: ['Nf3', 'Nf6', 'Nc3', 'e6'],
        description: 'Combines ideas from Slav and Queen\'s Gambit Declined.',
        source: 'theory',
        evaluation: '=',
      },
    ],
  },
  {
    name: 'Grünfeld Defense',
    ecoCode: 'D70',
    aliases: ['Grunfeld', 'Grünfeld'],
    mainLine: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    description: 'A hypermodern defense where Black allows White a strong center, then undermines it.',
    keywords: ['grunfeld', 'gruenfeld', 'd5 g6'],
    continuations: [
      {
        name: 'Exchange Variation',
        moves: ['cxd5', 'Nxd5', 'e4'],
        description: 'Main line with White building a big center.',
        source: 'theory',
        evaluation: '+0.3',
      },
      {
        name: 'Russian Variation',
        moves: ['Nf3', 'Bg7', 'Qb3'],
        description: 'Early queen development attacking d5.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Classical Exchange',
        moves: ['cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3'],
        description: 'Classical approach with doubled pawns.',
        source: 'theory',
        evaluation: '+0.2',
      },
    ],
  },
  {
    name: 'Pirc Defense',
    ecoCode: 'B07',
    aliases: ['Pirc'],
    mainLine: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'],
    description: 'A flexible hypermodern defense allowing White to build a center.',
    keywords: ['pirc', 'd6 g6'],
    continuations: [
      {
        name: 'Austrian Attack',
        moves: ['f4'],
        description: 'Aggressive approach with four center pawns.',
        source: 'theory',
        evaluation: '+0.4',
      },
      {
        name: 'Classical Variation',
        moves: ['Nf3', 'Bg7', 'Be2', 'O-O'],
        description: 'Solid development preparing castling.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Byrne Variation',
        moves: ['Bg5'],
        description: 'Early bishop development pinning the knight.',
        source: 'common',
        evaluation: '+0.2',
      },
    ],
  },
  {
    name: "Alekhine's Defense",
    ecoCode: 'B02',
    aliases: ['Alekhine', 'Alekhines Defense'],
    mainLine: ['e4', 'Nf6'],
    description: 'A hypermodern opening where Black provokes White to advance pawns, then attacks them.',
    keywords: ['alekhine', 'nf6 first'],
    continuations: [
      {
        name: 'Four Pawns Attack',
        moves: ['e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'f4'],
        description: 'Most aggressive with four center pawns.',
        source: 'theory',
        evaluation: '+0.5',
      },
      {
        name: 'Modern Variation',
        moves: ['e5', 'Nd5', 'd4', 'd6', 'Nf3'],
        description: 'Flexible development maintaining the center.',
        source: 'common',
        evaluation: '+0.3',
      },
      {
        name: 'Exchange Variation',
        moves: ['e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'exd6'],
        description: 'Simplifying the position early.',
        source: 'common',
        evaluation: '+0.2',
      },
    ],
  },
  {
    name: 'Scandinavian Defense',
    ecoCode: 'B01',
    aliases: ['Scandinavian', 'Center Counter'],
    mainLine: ['e4', 'd5'],
    description: 'Black immediately challenges White\'s central pawn with d5.',
    keywords: ['scandinavian', 'center counter', 'd5 immediately'],
    continuations: [
      {
        name: 'Modern Variation',
        moves: ['exd5', 'Nf6'],
        description: 'Black recaptures with the knight, keeping development flexible.',
        source: 'theory',
        evaluation: '+0.3',
      },
      {
        name: 'Main Line',
        moves: ['exd5', 'Qxd5', 'Nc3'],
        description: 'Classical approach with early queen development.',
        source: 'common',
        evaluation: '+0.4',
      },
      {
        name: 'Gubinsky-Melts Defense',
        moves: ['exd5', 'Qxd5', 'Nc3', 'Qd6'],
        description: 'Queen retreats to d6 maintaining central influence.',
        source: 'common',
        evaluation: '+0.3',
      },
    ],
  },
  {
    name: 'Vienna Game',
    ecoCode: 'C25',
    aliases: ['Vienna'],
    mainLine: ['e4', 'e5', 'Nc3'],
    description: 'An alternative to the Italian and Spanish, developing the knight to c3 first.',
    keywords: ['vienna', 'nc3 early'],
    continuations: [
      {
        name: 'Vienna Gambit',
        moves: ['Nf6', 'f4'],
        description: 'Aggressive gambit with f4.',
        source: 'common',
        evaluation: '+0.2',
      },
      {
        name: 'Main Line',
        moves: ['Nf6', 'Bc4', 'Nc6'],
        description: 'Solid development with Bc4.',
        source: 'theory',
        evaluation: '=',
      },
      {
        name: 'Max Lange Attack',
        moves: ['Nc6', 'Bc4', 'Nf6', 'd4'],
        description: 'Sharp tactical line with early d4.',
        source: 'common',
        evaluation: '+0.3',
      },
    ],
  },
  {
    name: 'Kings Gambit',
    ecoCode: 'C30',
    aliases: ['King\'s Gambit', 'Kings Gambit'],
    mainLine: ['e4', 'e5', 'f4'],
    description: 'One of the oldest and most romantic openings. White sacrifices the f-pawn for rapid development.',
    keywords: ['king', 'gambit', 'f4'],
    continuations: [
      {
        name: 'Kings Gambit Accepted',
        moves: ['exf4'],
        description: 'Black accepts the gambit pawn.',
        source: 'theory',
        evaluation: '+0.3',
      },
      {
        name: 'Kings Gambit Declined',
        moves: ['Bc5'],
        description: 'Classical decline with bishop development.',
        source: 'common',
        evaluation: '=',
      },
      {
        name: 'Falkbeer Counter Gambit',
        moves: ['d5'],
        description: 'Counter-gambit offering a pawn in return.',
        source: 'common',
        evaluation: '=',
      },
    ],
  },
];

/**
 * Search for an opening by name or keyword
 */
export function findOpening(query: string): ChessOpening | null {
  const lowerQuery = query.toLowerCase();

  // Try exact name match first
  for (const opening of OPENINGS_DATABASE) {
    if (opening.name.toLowerCase() === lowerQuery) {
      return opening;
    }

    // Try alias match
    for (const alias of opening.aliases) {
      if (alias.toLowerCase() === lowerQuery) {
        return opening;
      }
    }
  }

  // Try keyword match
  for (const opening of OPENINGS_DATABASE) {
    for (const keyword of opening.keywords) {
      if (lowerQuery.includes(keyword) || keyword.includes(lowerQuery)) {
        return opening;
      }
    }
  }

  return null;
}

/**
 * Get all openings that match a search query
 */
export function searchOpenings(query: string): ChessOpening[] {
  const lowerQuery = query.toLowerCase();
  const results: ChessOpening[] = [];

  for (const opening of OPENINGS_DATABASE) {
    // Check name
    if (opening.name.toLowerCase().includes(lowerQuery)) {
      results.push(opening);
      continue;
    }

    // Check aliases
    for (const alias of opening.aliases) {
      if (alias.toLowerCase().includes(lowerQuery)) {
        results.push(opening);
        break;
      }
    }

    // Check keywords
    for (const keyword of opening.keywords) {
      if (lowerQuery.includes(keyword) || keyword.includes(lowerQuery)) {
        if (!results.includes(opening)) {
          results.push(opening);
        }
        break;
      }
    }
  }

  return results;
}

/**
 * Get a random opening (for educational purposes)
 */
export function getRandomOpening(): ChessOpening {
  const randomIndex = Math.floor(Math.random() * OPENINGS_DATABASE.length);
  return OPENINGS_DATABASE[randomIndex];
}

// UCI message parsing utilities

export interface ScoreInfo {
  type: 'cp' | 'mate'
  value: number
}

export interface InfoLine {
  depth?: number
  seldepth?: number
  multipv?: number
  score?: ScoreInfo
  pv?: string[]
  nodes?: number
  nps?: number
  time?: number
}

/**
 * Parse a UCI "info" line into structured data
 * Example: info depth 20 seldepth 28 multipv 1 score cp 35 nodes 1234567 nps 500000 time 2468 pv e2e4 e7e5 g1f3
 */
export function parseInfoLine(line: string): InfoLine | null {
  if (!line.startsWith('info ')) return null

  const info: InfoLine = {}
  const tokens = line.split(' ')

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    switch (token) {
      case 'depth':
        info.depth = parseInt(tokens[++i])
        break
      case 'seldepth':
        info.seldepth = parseInt(tokens[++i])
        break
      case 'multipv':
        info.multipv = parseInt(tokens[++i])
        break
      case 'score':
        i++
        const scoreType = tokens[i] as 'cp' | 'mate'
        const scoreValue = parseInt(tokens[++i])
        info.score = { type: scoreType, value: scoreValue }
        break
      case 'nodes':
        info.nodes = parseInt(tokens[++i])
        break
      case 'nps':
        info.nps = parseInt(tokens[++i])
        break
      case 'time':
        info.time = parseInt(tokens[++i])
        break
      case 'pv':
        // Rest of the tokens are the PV
        info.pv = tokens.slice(i + 1)
        i = tokens.length // Exit loop
        break
    }
  }

  return info
}

/**
 * Parse a bestmove line
 * Example: bestmove e2e4 ponder e7e5
 */
export function parseBestMove(line: string): string | null {
  if (!line.startsWith('bestmove ')) return null

  const tokens = line.split(' ')
  return tokens[1] || null
}

/**
 * Convert UCI move to from/to format
 * Example: e2e4 -> { from: 'e2', to: 'e4', promotion: undefined }
 */
export function parseUciMove(uci: string): {
  from: string
  to: string
  promotion?: string
} | null {
  if (uci.length < 4) return null

  const from = uci.substring(0, 2)
  const to = uci.substring(2, 4)
  const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined

  return { from, to, promotion }
}

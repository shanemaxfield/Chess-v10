/// <reference lib="webworker" />

/**
 * Stockfish Web Worker
 * Uses importScripts to load Stockfish WASM from public directory
 */

let engine: any = null
let isReady = false
const commandQueue: string[] = []

function sendCommand(cmd: string) {
  if (!engine) {
    console.error('Stockfish not initialized')
    return
  }

  if (isReady) {
    engine.postMessage(cmd)
  } else {
    commandQueue.push(cmd)
  }
}

function processQueue() {
  while (commandQueue.length > 0) {
    const cmd = commandQueue.shift()
    if (cmd && engine) {
      engine.postMessage(cmd)
    }
  }
}

function handleEngineLine(line: string) {
  // Forward all engine output to main thread
  self.postMessage({ type: 'engineLine', data: line })

  // Handle specific responses
  if (line === 'uciok') {
    // UCI initialization complete, send isready
    engine.postMessage('isready')
  } else if (line === 'readyok') {
    if (!isReady) {
      isReady = true
      processQueue()
      self.postMessage({ type: 'ready' })
    }
  } else if (line.startsWith('bestmove ')) {
    const parts = line.split(' ')
    const move = parts[1]
    self.postMessage({ type: 'bestmove', data: move })
  }
}

// Initialize Stockfish using importScripts
function initStockfish() {
  try {
    // Load Stockfish from public directory
    importScripts('/stockfish/stockfish-17.1-lite-single-03e3232.js')

    // @ts-ignore - Stockfish is loaded via importScripts
    if (typeof Stockfish === 'function') {
      // @ts-ignore
      Stockfish().then((sf: any) => {
        engine = sf

        // Set up message listener
        sf.addMessageListener((line: string) => {
          handleEngineLine(line)
        })

        // Start UCI initialization
        sf.postMessage('uci')
      }).catch((error: any) => {
        self.postMessage({
          type: 'error',
          data: `Failed to initialize Stockfish: ${error}`,
        })
      })
    } else {
      self.postMessage({
        type: 'error',
        data: 'Stockfish function not found after importScripts',
      })
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: `Failed to load Stockfish: ${error}`,
    })
  }
}

// Handle messages from main thread
self.addEventListener('message', (e: MessageEvent) => {
  const { type, payload } = e.data

  switch (type) {
    case 'init': {
      if (!engine) {
        initStockfish()
      }

      // Wait for ready, then set options
      const waitForReady = () => {
        if (isReady) {
          const { multiPv = 3, threads = 1, skill = 20 } = payload || {}

          sendCommand(`setoption name MultiPV value ${multiPv}`)
          sendCommand(`setoption name Threads value ${threads}`)
          sendCommand(`setoption name Skill Level value ${skill}`)
          sendCommand('isready')
        } else {
          setTimeout(waitForReady, 50)
        }
      }
      waitForReady()
      break
    }

    case 'setPosition': {
      const { fen } = payload
      sendCommand(`position fen ${fen}`)
      break
    }

    case 'setPositionFromMoves': {
      const { moves } = payload
      if (moves && moves.length > 0) {
        sendCommand(`position startpos moves ${moves.join(' ')}`)
      } else {
        sendCommand('position startpos')
      }
      break
    }

    case 'analyze': {
      const { depth, movetimeMs } = payload || {}

      if (movetimeMs) {
        sendCommand(`go movetime ${movetimeMs}`)
      } else if (depth) {
        sendCommand(`go depth ${depth}`)
      } else {
        // Default: depth 20
        sendCommand('go depth 20')
      }
      break
    }

    case 'stop':
      sendCommand('stop')
      break

    case 'setOption': {
      const { name, value } = payload
      sendCommand(`setoption name ${name} value ${value}`)
      sendCommand('isready')
      break
    }

    case 'newGame':
      sendCommand('ucinewgame')
      sendCommand('isready')
      break

    default:
      console.warn('Unknown message type:', type)
  }
})

// Prevent TypeScript from treating this as a module
export {}

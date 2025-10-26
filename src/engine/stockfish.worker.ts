/// <reference lib="webworker" />

/**
 * Stockfish Web Worker
 *
 * Handles all communication with the Stockfish WASM engine.
 * Runs in a separate thread to avoid blocking the UI.
 *
 * Messages from main thread:
 * - { type: 'init', payload: { multiPv, threads, skill } }
 * - { type: 'setPosition', payload: { fen } }
 * - { type: 'setPositionFromMoves', payload: { moves } }
 * - { type: 'analyze', payload: { depth?, movetimeMs? } }
 * - { type: 'stop' }
 * - { type: 'setOption', payload: { name, value } }
 * - { type: 'newGame' }
 *
 * Messages to main thread:
 * - { type: 'ready' }
 * - { type: 'engineLine', data: string }
 * - { type: 'bestmove', data: string }
 * - { type: 'error', data: string }
 */

let stockfishWorker: Worker | null = null
let isReady = false

// Queue for commands sent before engine is ready
const commandQueue: string[] = []

function sendCommand(cmd: string) {
  if (!stockfishWorker) {
    console.error('Stockfish not initialized')
    return
  }

  if (isReady) {
    stockfishWorker.postMessage(cmd)
  } else {
    commandQueue.push(cmd)
  }
}

function processQueue() {
  while (commandQueue.length > 0) {
    const cmd = commandQueue.shift()
    if (cmd && stockfishWorker) {
      stockfishWorker.postMessage(cmd)
    }
  }
}

function handleEngineLine(line: string) {
  // Forward all engine output to main thread
  self.postMessage({ type: 'engineLine', data: line })

  // Handle specific responses
  if (line === 'uciok') {
    // UCI initialization complete, send isready
    stockfishWorker?.postMessage('isready')
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

// Initialize Stockfish
function initStockfish() {
  try {
    // Load the Stockfish worker from public directory
    // This is the lite-single version which is more compatible
    stockfishWorker = new Worker('/stockfish/stockfish-17.1-lite-single-03e3232.js')

    stockfishWorker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      handleEngineLine(line)
    }

    stockfishWorker.onerror = (error: ErrorEvent) => {
      self.postMessage({
        type: 'error',
        data: `Stockfish worker error: ${error.message}`,
      })
    }

    // Start UCI initialization
    stockfishWorker.postMessage('uci')
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: `Failed to initialize Stockfish: ${error}`,
    })
  }
}

// Handle messages from main thread
self.addEventListener('message', (e: MessageEvent) => {
  const { type, payload } = e.data

  switch (type) {
    case 'init': {
      if (!stockfishWorker) {
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

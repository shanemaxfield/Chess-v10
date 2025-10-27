/// <reference lib="webworker" />

/**
 * Stockfish Web Worker
 * Uses importScripts to load Stockfish WASM from public directory
 * Debug version with extensive logging
 */

let engine: any = null
let isReady = false
const commandQueue: string[] = []

// Debug: Log to main thread
function debug(msg: string) {
  self.postMessage({ type: 'engineLine', data: `[WORKER DEBUG] ${msg}` })
}

function sendCommand(cmd: string) {
  if (!engine) {
    debug('ERROR: Stockfish not initialized when trying to send: ' + cmd)
    return
  }

  if (isReady) {
    debug('Sending command: ' + cmd)
    engine.postMessage(cmd)
  } else {
    debug('Queueing command: ' + cmd)
    commandQueue.push(cmd)
  }
}

function processQueue() {
  debug(`Processing queue with ${commandQueue.length} commands`)
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
    debug('Received uciok, sending isready')
    engine.postMessage('isready')
  } else if (line === 'readyok') {
    if (!isReady) {
      debug('Engine is ready!')
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
  debug('Starting Stockfish initialization...')

  try {
    debug('Loading stockfish via importScripts...')
    // Load Stockfish from public directory
    importScripts('/stockfish/stockfish-17.1-lite-single-03e3232.js')
    debug('importScripts completed')

    // Check what was loaded
    // @ts-ignore
    debug(`typeof Stockfish: ${typeof Stockfish}`)
    // @ts-ignore
    debug(`typeof STOCKFISH: ${typeof STOCKFISH}`)
    // @ts-ignore
    debug(`self keys: ${Object.keys(self).filter(k => k.toLowerCase().includes('stock')).join(', ')}`)

    // Try different ways Stockfish might be exposed
    // @ts-ignore
    const StockfishFunc = typeof Stockfish !== 'undefined' ? Stockfish :
                          // @ts-ignore
                          typeof STOCKFISH !== 'undefined' ? STOCKFISH : null

    if (StockfishFunc && typeof StockfishFunc === 'function') {
      debug('Found Stockfish function, calling it...')

      // Call Stockfish() - it returns a promise
      const result = StockfishFunc()

      debug(`Stockfish() returned: ${typeof result}`)

      if (result && typeof result.then === 'function') {
        debug('Stockfish() returned a promise, waiting...')
        result.then((sf: any) => {
          debug('Stockfish promise resolved!')
          engine = sf

          // Set up message listener
          if (sf.addMessageListener) {
            debug('Setting up message listener')
            sf.addMessageListener((line: string) => {
              handleEngineLine(line)
            })
          } else {
            debug('ERROR: No addMessageListener method!')
          }

          // Start UCI initialization
          debug('Sending UCI command')
          sf.postMessage('uci')
        }).catch((error: any) => {
          debug(`Promise rejected: ${error}`)
          self.postMessage({
            type: 'error',
            data: `Failed to initialize Stockfish: ${error}`,
          })
        })
      } else {
        debug('Stockfish() did not return a promise')
        // Maybe it's synchronous?
        engine = result
        if (engine && engine.postMessage) {
          debug('Using synchronous result')
          if (engine.addMessageListener) {
            engine.addMessageListener(handleEngineLine)
          }
          engine.postMessage('uci')
        } else {
          self.postMessage({
            type: 'error',
            data: 'Stockfish returned invalid object',
          })
        }
      }
    } else {
      debug(`ERROR: Stockfish function not found! Type: ${typeof StockfishFunc}`)
      self.postMessage({
        type: 'error',
        data: 'Stockfish function not found after importScripts',
      })
    }
  } catch (error) {
    debug(`Exception in initStockfish: ${error}`)
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
      debug('Received init message')
      if (!engine) {
        initStockfish()
      }

      // Wait for ready, then set options
      const waitForReady = () => {
        if (isReady) {
          const { multiPv = 3, threads = 1, skill = 20 } = payload || {}
          debug(`Setting options: MultiPV=${multiPv}, Threads=${threads}, Skill=${skill}`)
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
      debug(`Unknown message type: ${type}`)
  }
})

debug('Worker script loaded')

export {}

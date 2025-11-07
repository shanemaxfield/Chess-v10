/// <reference lib="webworker" />

/**
 * Stockfish Web Worker
 * Creates a nested classic worker to load Stockfish WASM (since module workers can't use importScripts)
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

// Initialize Stockfish directly in this worker
function initStockfish() {
  debug('Starting Stockfish initialization...')

  try {
    // Load Stockfish script using fetch and eval
    debug('Loading Stockfish script...')
    
    // Get the correct origin - use import.meta.url if available, otherwise self.location
    const origin = typeof import.meta !== 'undefined' && import.meta.url 
      ? new URL(import.meta.url).origin 
      : (self.location?.origin || window?.location?.origin || '')
    
    const stockfishUrl = `${origin}/stockfish/stockfish-17.1-lite-single-03e3232.js`
    debug(`Fetching Stockfish from: ${stockfishUrl}`)
    
    fetch(stockfishUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.text()
      })
      .then(scriptText => {
        debug('Stockfish script fetched, evaluating...')
        
        // Create a function that will execute the script in the right context
        const scriptFunction = new Function(scriptText)
        scriptFunction()
        
        debug('Stockfish script evaluated')
        initializeStockfishEngine()
      })
      .catch(error => {
        debug(`Failed to fetch Stockfish script: ${error}`)
        self.postMessage({ type: 'error', data: `Failed to fetch Stockfish script: ${error.message || error}` })
      })

  } catch (error) {
    debug(`Exception in initStockfish: ${error}`)
    self.postMessage({
      type: 'error',
      data: `Failed to load Stockfish: ${error}`,
    })
  }
}

function initializeStockfishEngine() {
  debug('Initializing Stockfish engine...')
  
  // Try to find the Stockfish function
  let StockfishFunction = null
  
  // Check different ways the function might be exposed
  if (typeof Stockfish !== 'undefined') {
    StockfishFunction = Stockfish
    debug('Found Stockfish on global scope')
  } else if (typeof self.Stockfish !== 'undefined') {
    StockfishFunction = self.Stockfish
    debug('Found Stockfish on self scope')
  } else {
    debug('Stockfish not found, checking available globals...')
    debug('Available globals:', Object.keys(self))
    
    // Check if the script created any global variables
    debug('Checking for any new globals after script execution...')
    const allGlobals = Object.keys(self)
    debug('All globals after script:', allGlobals)
    
    // Look for any function that might be Stockfish
    const possibleFunctions = allGlobals.filter(key => 
      typeof self[key] === 'function' && 
      (key.toLowerCase().includes('stockfish') || key === 'e' || key.length === 1)
    )
    
    debug('Possible Stockfish functions:', possibleFunctions)
    
    // Also check if there are any properties on self that might contain the function
    for (const key of allGlobals) {
      if (typeof self[key] === 'object' && self[key] !== null) {
        debug(`Checking object ${key}:`, Object.keys(self[key]))
        if (typeof self[key].Stockfish === 'function') {
          StockfishFunction = self[key].Stockfish
          debug(`Found Stockfish in object ${key}`)
          break
        }
      }
    }
    
    if (possibleFunctions.length > 0 && !StockfishFunction) {
      StockfishFunction = self[possibleFunctions[0]]
      debug(`Using function: ${possibleFunctions[0]}`)
    }
  }
  
  if (!StockfishFunction) {
    debug('No Stockfish function found')
    self.postMessage({ type: 'error', data: 'Stockfish function not found' })
    return
  }
  
  debug('Calling Stockfish function...')
  
  // Test WASM file accessibility
  const wasmUrl = `${self.location.origin}/stockfish/stockfish-17.1-lite-single-03e3232.wasm`
  debug(`Testing WASM file accessibility: ${wasmUrl}`)
  
  fetch(wasmUrl)
    .then(response => {
      debug(`WASM fetch response status: ${response.status}`)
      debug(`WASM fetch response headers:`, Object.fromEntries(response.headers.entries()))
      return response.arrayBuffer()
    })
    .then(buffer => {
      debug(`WASM file size: ${buffer.byteLength} bytes`)
      debug(`WASM file first 4 bytes:`, Array.from(new Uint8Array(buffer.slice(0, 4))))
    })
    .catch(error => {
      debug(`WASM file test failed: ${error}`)
    })
  
  // Configure Stockfish
  const stockfishConfig = {
    locateFile: function(path) {
      debug(`locateFile called with path: ${path}`)
      let resolvedPath
      
      if (path.endsWith('.wasm')) {
        resolvedPath = `${self.location.origin}/stockfish/stockfish-17.1-lite-single-03e3232.wasm`
        debug(`Resolved WASM path: ${resolvedPath}`)
      } else if (path.endsWith('.js')) {
        resolvedPath = `${self.location.origin}/stockfish/stockfish-17.1-lite-single-03e3232.js`
        debug(`Resolved JS path: ${resolvedPath}`)
      } else {
        resolvedPath = `${self.location.origin}/stockfish/${path}`
        debug(`Resolved other path: ${resolvedPath}`)
      }
      
      return resolvedPath
    }
  }
  
  try {
    const result = StockfishFunction(stockfishConfig)
    
    if (result && typeof result.then === 'function') {
      debug('Stockfish returned a promise, waiting...')
      result.then((sf) => {
        debug('Stockfish promise resolved!')
        engine = sf
        
        // Set up message listener
        sf.addMessageListener((line) => {
          handleEngineLine(line)
        })
        
        // Send ready signal
        self.postMessage({ type: 'ready' })
        
        // Send initial UCI command
        sf.postMessage('uci')
      }).catch((error) => {
        debug(`Stockfish promise rejected: ${error}`)
        self.postMessage({ type: 'error', data: String(error) })
      })
    } else {
      debug('Stockfish did not return a promise')
      self.postMessage({ type: 'error', data: 'Stockfish did not return a promise' })
    }
  } catch (error) {
    debug(`Error calling Stockfish function: ${error}`)
    self.postMessage({ type: 'error', data: String(error) })
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

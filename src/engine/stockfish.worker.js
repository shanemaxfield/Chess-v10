// Classic Web Worker for Stockfish
// This file must be a .js file (not .ts) to work as a classic worker

console.log('[STOCKFISH WORKER] Worker started')

// Store original console methods to intercept Stockfish output
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Intercept console.log to capture Stockfish output
console.log = function(...args) {
  // Always log to original console first
  originalConsoleLog.apply(console, args)
  
  // Check if this is Stockfish engine output (only if it matches known patterns)
  const message = args.join(' ').trim()
  
  // Stockfish output patterns
  const isStockfishOutput = 
    message.startsWith('info ') || 
    message.startsWith('bestmove ') || 
    message === 'uciok' || 
    message === 'readyok' ||
    message.startsWith('id ')
  
  // Only intercept if it's Stockfish output and not our own debug messages
  if (isStockfishOutput && !message.includes('[STOCKFISH WORKER]')) {
    // This is Stockfish engine output - send it to the main thread
    postMessage({ type: 'engineLine', data: message })
  }
}

// Intercept console.error for Stockfish errors
console.error = function(...args) {
  // Always log to original console first
  originalConsoleError.apply(console, args)
  
  // Check if this is Stockfish engine output
  const message = args.join(' ')
  const isStockfishOutput = 
    (message.includes('info ') || message.includes('bestmove ')) &&
    !message.includes('[STOCKFISH WORKER]')
  
  if (isStockfishOutput) {
    // This is Stockfish engine output - send it to the main thread
    postMessage({ type: 'engineLine', data: message })
  }
}

// Create a window-like object for the script
self.window = self
self.document = {
  createElement: () => ({ src: '', onload: null, onerror: null }),
  head: { appendChild: () => {} }
}

// Add other globals the script might expect
self.location = { origin: self.location.origin }
self.navigator = { userAgent: 'Worker' }
self.console = console

// Add module system globals
self.exports = {}
self.module = { exports: self.exports }
self.define = function(name, deps, factory) {
  if (typeof deps === 'function') {
    factory = deps
    deps = []
  }
  const result = factory()
  if (result) {
    self.exports = result
    if (result.default) {
      self.Stockfish = result.default
    }
  }
}

console.log('[STOCKFISH WORKER] Created browser and module globals')

// Load Stockfish using importScripts
console.log('[STOCKFISH WORKER] Loading Stockfish via importScripts...')
try {
  importScripts('/stockfish/stockfish-17.1-lite-single-03e3232.js')
  console.log('[STOCKFISH WORKER] importScripts completed successfully')
} catch (error) {
  console.error('[STOCKFISH WORKER] importScripts failed:', error)
  postMessage({ type: 'error', message: `importScripts failed: ${error.message}` })
  // Don't use return in top-level scope
}

// VERIFICATION: Check typeof self.Stockfish immediately after loading
console.log('[STOCKFISH WORKER] typeof self.Stockfish:', typeof self.Stockfish)
console.log('[STOCKFISH WORKER] typeof self.e:', typeof self.e)

// Check if any new properties were added to self
const newSelfKeys = Object.keys(self)
console.log('[STOCKFISH WORKER] New self keys after importScripts:', newSelfKeys)

// Check if the script added any new properties by comparing with initial keys
const initialKeys = ['name', 'onmessage', 'onmessageerror', 'cancelAnimationFrame', 'close', 'postMessage', 'requestAnimationFrame', 'webkitRequestFileSystem', 'webkitRequestFileSystemSync', 'webkitResolveLocalFileSystemSyncURL', 'webkitResolveLocalFileSystemURL']
const addedKeys = newSelfKeys.filter(key => !initialKeys.includes(key))
console.log('[STOCKFISH WORKER] Keys added by script:', addedKeys)

// Check if any of the added keys are functions
const addedFunctions = addedKeys.filter(key => typeof self[key] === 'function')
console.log('[STOCKFISH WORKER] Functions added by script:', addedFunctions)

// Check if the script set anything on exports
console.log('[STOCKFISH WORKER] self.exports:', self.exports)
console.log('[STOCKFISH WORKER] self.module.exports:', self.module.exports)

// Check if define was called
console.log('[STOCKFISH WORKER] typeof self.define:', typeof self.define)

// Look for Stockfish function
let StockfishFunction = null

// Check module.exports first (CommonJS pattern)
if (self.module && self.module.exports && typeof self.module.exports === 'function') {
  StockfishFunction = self.module.exports
  console.log('[STOCKFISH WORKER] Found Stockfish in module.exports')
} else if (typeof self.Stockfish !== 'undefined') {
  StockfishFunction = self.Stockfish
  console.log('[STOCKFISH WORKER] Found Stockfish on self')
} else if (typeof self.e !== 'undefined') {
  StockfishFunction = self.e
  console.log('[STOCKFISH WORKER] Found function e on self')
} else {
  // Check all properties on self
  const selfKeys = Object.keys(self)
  console.log('[STOCKFISH WORKER] All self keys:', selfKeys)
  
  const functions = selfKeys.filter(key => typeof self[key] === 'function')
  console.log('[STOCKFISH WORKER] All functions on self:', functions)
  
  // Look for any function that might be Stockfish
  const possibleFunctions = functions.filter(key => 
    key.toLowerCase().includes('stockfish') || 
    key === 'e' || 
    key.length === 1
  )
  
  console.log('[STOCKFISH WORKER] Possible functions:', possibleFunctions)
  
  if (possibleFunctions.length > 0) {
    StockfishFunction = self[possibleFunctions[0]]
    console.log('[STOCKFISH WORKER] Using function:', possibleFunctions[0])
  }
}

if (!StockfishFunction) {
  console.error('[STOCKFISH WORKER] Stockfish function not found!')
  postMessage({ type: 'error', message: 'Stockfish function not found' })
} else {
  console.log('[STOCKFISH WORKER] Stockfish function found:', typeof StockfishFunction)
  
  // Initialize Stockfish
  try {
        const stockfishConfig = {
          locateFile: (path) => {
            console.log('[STOCKFISH WORKER] locateFile called with path:', path)
            let resolvedPath
            if (path.endsWith('.wasm')) {
              resolvedPath = '/stockfish/stockfish-17.1-lite-single-03e3232.wasm'
              console.log('[STOCKFISH WORKER] Resolved WASM path:', resolvedPath)
              // Test if the WASM file is accessible
              fetch(resolvedPath).then(response => {
                console.log('[STOCKFISH WORKER] WASM fetch response:', response.status, response.headers.get('content-type'))
              }).catch(error => {
                console.error('[STOCKFISH WORKER] WASM fetch error:', error)
              })
            } else if (path.endsWith('.js')) {
              resolvedPath = '/stockfish/stockfish-17.1-lite-single-03e3232.js'
              console.log('[STOCKFISH WORKER] Resolved JS path:', resolvedPath)
            } else {
              resolvedPath = `/stockfish/${path}`
              console.log('[STOCKFISH WORKER] Resolved other path:', resolvedPath)
            }
            return resolvedPath
          },
          print: (line) => {
            console.log('[STOCKFISH WORKER] CONFIG PRINT CALLED:', line)
            // Send to main thread - but note: this might not be called if script uses console.log directly
            postMessage({ type: 'engineLine', data: String(line) })
            // Also call original console.log so we see it in worker console
            originalConsoleLog('[STOCKFISH WORKER] CONFIG PRINT:', line)
          },
          printErr: (line) => {
            console.error('[STOCKFISH WORKER] CONFIG PRINTERR CALLED:', line)
            // Send to main thread
            postMessage({ type: 'engineLine', data: `info string ${String(line)}` })
            // Also call original console.error
            originalConsoleError('[STOCKFISH WORKER] CONFIG PRINTERR:', line)
          },
        }

    console.log('[STOCKFISH WORKER] Calling Stockfish function...')
    const result = StockfishFunction(stockfishConfig)

    if (result && typeof result.then === 'function') {
      console.log('[STOCKFISH WORKER] Stockfish() returned a promise, waiting...')
      result.then((sf) => {
        console.log('[STOCKFISH WORKER] Stockfish promise resolved!')
        self.engine = sf
        
        // CRITICAL: Override engine's print/printErr functions directly
        // The config callbacks might not persist, so we override the engine object's methods
        console.log('[STOCKFISH WORKER] Overriding engine print/printErr functions...')
        
        // Store original functions if they exist
        const originalPrint = self.engine.print
        const originalPrintErr = self.engine.printErr
        
        // Override print to capture all engine output
        self.engine.print = function(line) {
          console.log('[STOCKFISH WORKER] ENGINE PRINT CALLED:', line)
          postMessage({ type: 'engineLine', data: String(line) })
          // Call original if it exists
          if (originalPrint && typeof originalPrint === 'function') {
            originalPrint.call(self.engine, line)
          }
        }
        
        // Override printErr to capture errors
        self.engine.printErr = function(line) {
          console.error('[STOCKFISH WORKER] ENGINE PRINTERR CALLED:', line)
          postMessage({ type: 'engineLine', data: `info string ${String(line)}` })
          // Call original if it exists
          if (originalPrintErr && typeof originalPrintErr === 'function') {
            originalPrintErr.call(self.engine, line)
          }
        }
        
        console.log('[STOCKFISH WORKER] Print functions overridden successfully')
        console.log('[STOCKFISH WORKER] New print function type:', typeof self.engine.print)
        console.log('[STOCKFISH WORKER] New printErr function type:', typeof self.engine.printErr)
        
        // Let's inspect the engine object more thoroughly
        console.log('[STOCKFISH WORKER] Engine object keys:', Object.keys(self.engine))
        console.log('[STOCKFISH WORKER] Engine prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(self.engine)))
        
        // Check if there are other methods we should be using
        const possibleMethods = Object.getOwnPropertyNames(self.engine).filter(name => 
          name.toLowerCase().includes('command') || 
          name.toLowerCase().includes('send') || 
          name.toLowerCase().includes('post') ||
          name.toLowerCase().includes('write') ||
          name.toLowerCase().includes('input')
        )
        console.log('[STOCKFISH WORKER] Possible command methods:', possibleMethods)
        
        // Try calling _command directly to see what happens
        console.log('[STOCKFISH WORKER] Testing _command directly...')
        try {
          const result = self.engine._command('uci')
          console.log('[STOCKFISH WORKER] _command result:', result)
        } catch (error) {
          console.error('[STOCKFISH WORKER] _command error:', error)
        }
        
        // Try calling _main to initialize the engine
        console.log('[STOCKFISH WORKER] Testing _main...')
        try {
          const mainResult = self.engine._main()
          console.log('[STOCKFISH WORKER] _main result:', mainResult)
        } catch (error) {
          console.error('[STOCKFISH WORKER] _main error:', error)
        }
        
        // Try using ccall to call the command function
        console.log('[STOCKFISH WORKER] Testing ccall...')
        try {
          const ccallResult = self.engine.ccall('command', 'string', ['string'], ['uci'])
          console.log('[STOCKFISH WORKER] ccall result:', ccallResult)
        } catch (error) {
          console.error('[STOCKFISH WORKER] ccall error:', error)
        }
        
        // Send initial UCI command
        self.sendCommand('uci')
        
        postMessage({ type: 'ready' })
      }).catch((error) => {
        console.error('[STOCKFISH WORKER] Stockfish promise rejected:', error)
        postMessage({ type: 'error', message: String(error) })
      })
    } else {
      console.log('[STOCKFISH WORKER] Stockfish() did not return a promise')
      postMessage({ type: 'error', message: 'Stockfish() did not return a promise' })
    }
  } catch (error) {
    console.error('[STOCKFISH WORKER] Error initializing Stockfish:', error)
    postMessage({ type: 'error', message: String(error) })
  }
}

// Helper function to send commands to Stockfish
self.sendCommand = function(command) {
  if (self.engine) {
    console.log('[STOCKFISH WORKER] Sending command:', command)
    
    // Try different methods in order of preference
    if (self.engine.ccall) {
      console.log('[STOCKFISH WORKER] Using ccall method')
      try {
        const result = self.engine.ccall('command', 'string', ['string'], [command])
        console.log('[STOCKFISH WORKER] ccall result:', result)
        return
      } catch (error) {
        console.error('[STOCKFISH WORKER] ccall error:', error)
      }
    }
    
    if (self.engine.run) {
      console.log('[STOCKFISH WORKER] Using run method')
      try {
        const result = self.engine.run(command)
        console.log('[STOCKFISH WORKER] run result:', result)
        return
      } catch (error) {
        console.error('[STOCKFISH WORKER] run error:', error)
      }
    }
    
    if (self.engine._command) {
      console.log('[STOCKFISH WORKER] Using _command method')
      try {
        const result = self.engine._command(command)
        console.log('[STOCKFISH WORKER] _command result:', result)
        return
      } catch (error) {
        console.error('[STOCKFISH WORKER] _command error:', error)
      }
    }
    
    if (self.engine.postMessage) {
      console.log('[STOCKFISH WORKER] Using postMessage method')
      self.engine.postMessage(command)
      return
    }
    
    if (self.engine.send) {
      console.log('[STOCKFISH WORKER] Using send method')
      self.engine.send(command)
      return
    }
    
    console.error('[STOCKFISH WORKER] No method to send command:', command)
    console.log('[STOCKFISH WORKER] Available methods:', Object.getOwnPropertyNames(self.engine))
  } else {
    console.error('[STOCKFISH WORKER] Engine not available for command:', command)
  }
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data
  console.log('[STOCKFISH WORKER] Received message:', type, data)
  
  if (!self.engine) {
    console.log('[STOCKFISH WORKER] Engine not ready yet')
    return
  }
  
  switch (type) {
    case 'init':
      console.log('[STOCKFISH WORKER] Initializing with options:', data)
      const { multiPv = 3, threads = 1, skill } = data || {}
      
      // Set MultiPV
      self.sendCommand(`setoption name MultiPV value ${multiPv}`)
      
      // Set Threads
      self.sendCommand(`setoption name Threads value ${threads}`)
      
      // Set Hash size (128 MB) for better transposition table usage
      // This improves analysis consistency and speed
      self.sendCommand('setoption name Hash value 128')
      
      // Only set Skill Level if provided (for deterministic analysis, don't set it)
      // Skill Level introduces randomness which causes different recommendations
      if (skill !== undefined) {
        self.sendCommand(`setoption name Skill Level value ${skill}`)
      }
      
      self.sendCommand('isready')
      break
      
    case 'setPosition':
      console.log('[STOCKFISH WORKER] Setting position:', data)
      self.sendCommand(`position fen ${data}`)
      break
      
    case 'setPositionFromMoves':
      console.log('[STOCKFISH WORKER] Setting position from moves:', data)
      if (data && data.length > 0) {
        self.sendCommand(`position startpos moves ${data.join(' ')}`)
      } else {
        self.sendCommand('position startpos')
      }
      break
      
    case 'analyze':
      console.log('[STOCKFISH WORKER] Analyzing with params:', data)
      const { depth, movetimeMs } = data || {}
      if (movetimeMs) {
        self.sendCommand(`go movetime ${movetimeMs}`)
      } else if (depth) {
        self.sendCommand(`go depth ${depth}`)
      } else {
        self.sendCommand('go depth 20')
      }
      break
      
    case 'stop':
      console.log('[STOCKFISH WORKER] Stopping analysis')
      self.sendCommand('stop')
      break
      
    case 'setOption':
      console.log('[STOCKFISH WORKER] Setting option:', data)
      const { name, value } = data
      self.sendCommand(`setoption name ${name} value ${value}`)
      self.sendCommand('isready')
      break
      
    case 'newGame':
      console.log('[STOCKFISH WORKER] Starting new game')
      self.sendCommand('ucinewgame')
      self.sendCommand('isready')
      break
      
    default:
      console.log('[STOCKFISH WORKER] Unknown message type:', type)
  }
}

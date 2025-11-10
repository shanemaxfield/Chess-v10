import { useGameStore } from '../store/gameStore'

function TopBar() {
  const { toggleTheme, isDarkMode } = useGameStore()

  return (
    <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/50 dark:border-stone-700/50 shadow-sm">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 22H5v-2h14v2zm-7-1.5c2.48 0 4.5-2.02 4.5-4.5V8.5c0-1.88-1.46-3.42-3.31-3.56C12.46 3.07 11 2 9.5 2 7.57 2 6 3.57 6 5.5c0 .8.27 1.53.72 2.11C5.29 8.68 4 10.5 4 12.5c0 2.48 2.02 4.5 4.5 4.5H12zm-3.5-2c-1.38 0-2.5-1.12-2.5-2.5S7.12 13.5 8.5 13.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-stone-800 to-stone-600 dark:from-stone-100 dark:to-stone-300 bg-clip-text text-transparent">
              Chess Analysis
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400 tracking-wide">
              Advanced AI-Powered Platform
            </p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all duration-200 group"
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-stone-700 group-hover:text-stone-900 transition-colors" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}

export default TopBar

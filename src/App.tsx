import { useEffect } from 'react'
import ChessBoard from './components/ChessBoard'
import TopBar from './components/TopBar'
import Controls from './components/Controls'
import MoveList from './components/MoveList'
import PromotionModal from './components/PromotionModal'
import { useGameStore } from './store/gameStore'
import { initializeTheme } from './lib/theme'

function App() {
  const isDarkMode = useGameStore((state) => state.isDarkMode)

  useEffect(() => {
    initializeTheme()
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col items-center">
          <ChessBoard />
          <Controls />
        </div>
        <aside className="lg:w-80 flex flex-col">
          <MoveList />
        </aside>
      </main>
      <PromotionModal />
    </div>
  )
}

export default App

declare module 'stockfish' {
  interface StockfishInstance {
    postMessage(command: string): void
    addMessageListener(callback: (message: string) => void): void
    terminate?(): void
  }

  type StockfishFactory = () => Promise<StockfishInstance>

  const Stockfish: StockfishFactory
  export default Stockfish
}

import { describe, it, expect } from 'vitest'
import {
  squareToCoords,
  coordsToSquare,
  getSquareColor,
  fileToIndex,
  rankToIndex,
} from '../lib/chessEngine'

describe('Chess Engine Utilities', () => {
  describe('squareToCoords', () => {
    it('should convert square to coordinates', () => {
      expect(squareToCoords('a1')).toEqual({ file: 0, rank: 0 })
      expect(squareToCoords('h8')).toEqual({ file: 7, rank: 7 })
      expect(squareToCoords('e4')).toEqual({ file: 4, rank: 3 })
    })
  })

  describe('coordsToSquare', () => {
    it('should convert coordinates to square', () => {
      expect(coordsToSquare(0, 0)).toBe('a1')
      expect(coordsToSquare(7, 7)).toBe('h8')
      expect(coordsToSquare(4, 3)).toBe('e4')
    })

    it('should return null for invalid coordinates', () => {
      expect(coordsToSquare(-1, 0)).toBeNull()
      expect(coordsToSquare(8, 0)).toBeNull()
      expect(coordsToSquare(0, -1)).toBeNull()
      expect(coordsToSquare(0, 8)).toBeNull()
    })
  })

  describe('getSquareColor', () => {
    it('should return correct square color', () => {
      expect(getSquareColor('a1')).toBe('dark')
      expect(getSquareColor('a8')).toBe('light')
      expect(getSquareColor('h1')).toBe('light')
      expect(getSquareColor('h8')).toBe('dark')
      expect(getSquareColor('e4')).toBe('light')
    })
  })

  describe('fileToIndex', () => {
    it('should convert file to index', () => {
      expect(fileToIndex('a')).toBe(0)
      expect(fileToIndex('h')).toBe(7)
      expect(fileToIndex('e')).toBe(4)
    })
  })

  describe('rankToIndex', () => {
    it('should convert rank to index', () => {
      expect(rankToIndex('1')).toBe(0)
      expect(rankToIndex('8')).toBe(7)
      expect(rankToIndex('4')).toBe(3)
    })
  })
})

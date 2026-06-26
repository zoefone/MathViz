import type JXG from 'jsxgraph'

let boardInstance: JXG.Board | null = null

export function setBoardInstance(board: JXG.Board | null) {
  boardInstance = board
}

export function getBoardInstance(): JXG.Board | null {
  return boardInstance
}

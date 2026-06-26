export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark')
}

export function graphTheme(darkMode?: boolean) {
  const dark = darkMode ?? isDarkMode()
  return {
    stroke: dark ? '#F5F5F7' : '#1C1C1E',
    strokeMuted: '#8E8E93',
    axis: dark ? '#AEAEB2' : '#3A3A3C',
    grid: dark ? '#48484A' : '#E5E5EA',
    fill: dark ? '#3A3A3C' : '#E5E5EA',
    label: dark ? '#AEAEB2' : '#3A3A3C',
    canvas: dark ? '#2C2C2E' : '#FFFFFF',
  }
}

export function applyBoardTheme(board: JXG.Board, darkMode?: boolean) {
  const t = graphTheme(darkMode)
  const container = (board as unknown as { containerObj?: HTMLElement }).containerObj
  if (container) {
    container.style.backgroundColor = ''
    container.style.background = ''
    const svg = container.querySelector('svg')
    if (svg) {
      svg.style.background = ''
      svg.style.backgroundColor = ''
    }
  }

  const defaultAxes = (board as unknown as { defaultAxes?: { x?: JXG.GeometryElement; y?: JXG.GeometryElement } })
    .defaultAxes
  for (const ax of [defaultAxes?.x, defaultAxes?.y]) {
    if (!ax?.setAttribute) continue
    ax.setAttribute({ strokeColor: t.axis } as JXG.GeometryElementAttributes)
  }
  board.update()
}

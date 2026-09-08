import { useEffect, useState } from 'react'

const KEYS = ['--team-a', '--team-b', '--line', '--ink-mute', '--surface-2'] as const
type Key = (typeof KEYS)[number]
export type ThemeColors = Record<Key, string>

const read = (): ThemeColors => {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(KEYS.map((k) => [k, style.getPropertyValue(k).trim()])) as ThemeColors
}

/** 차트는 CSS 변수를 못 읽으니, 실제 색 값을 뽑아 넘겨준다. 테마가 바뀌면 다시 읽는다. */
export const useThemeColors = (): ThemeColors => {
  const [colors, setColors] = useState<ThemeColors>(read)
  useEffect(() => {
    const update = () => setColors(read())
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return colors
}

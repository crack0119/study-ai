import type { KoreanChoice, MathChoice } from '../types'

export const KOREAN_CHOICES: KoreanChoice[] = ['화법과작문', '언어와매체']
export const MATH_CHOICES: MathChoice[] = ['확률과통계', '미적분', '기하']

/** 탐구 드롭다운. 사탐은 실제로 고르는 두 과목만, 과탐은 Ⅰ·Ⅱ 전부. */
export const EXPLORE_GROUPS: { label: string; subjects: string[] }[] = [
  {
    label: '사회탐구',
    subjects: ['생활과 윤리', '사회·문화'],
  },
  {
    label: '과학탐구',
    subjects: [
      '물리학Ⅰ',
      '화학Ⅰ',
      '생명과학Ⅰ',
      '지구과학Ⅰ',
      '물리학Ⅱ',
      '화학Ⅱ',
      '생명과학Ⅱ',
      '지구과학Ⅱ',
    ],
  },
]

export const EXPLORE_SUBJECTS: string[] = EXPLORE_GROUPS.flatMap((g) => g.subjects)

export const SUBJECT_SHORT: Record<string, string> = {
  '화법과작문': '화작',
  '언어와매체': '언매',
  '확률과통계': '확통',
  '미적분': '미적',
  '기하': '기하',
  '생활과 윤리': '생윤',
  '사회·문화': '사문',
  '물리학Ⅰ': '물I',
  '화학Ⅰ': '화I',
  '생명과학Ⅰ': '생I',
  '지구과학Ⅰ': '지I',
  '물리학Ⅱ': '물II',
  '화학Ⅱ': '화II',
  '생명과학Ⅱ': '생II',
  '지구과학Ⅱ': '지II',
}

export const shortName = (subject: string | null): string =>
  subject ? SUBJECT_SHORT[subject] ?? subject : '—'

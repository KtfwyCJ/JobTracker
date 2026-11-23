import { describe, it, expect } from 'vitest'
import { diffLines } from '../textdiff'

const ten = Array.from({ length: 10 }, (_, i) => `L${i}`)

describe('diffLines', () => {
  it('identical → []', () => expect(diffLines('a\nb', 'a\nb')).toEqual([]))
  it('one changed line gets 2 lines of context', () => {
    const b = [...ten]; b[5] = 'X'
    expect(diffLines(ten.join('\n'), b.join('\n'))).toEqual([{ lines: [
      { kind: 'same', text: 'L3' }, { kind: 'same', text: 'L4' },
      { kind: 'del', text: 'L5' }, { kind: 'add', text: 'X' },
      { kind: 'same', text: 'L6' }, { kind: 'same', text: 'L7' },
    ] }])
  })
  it('far-apart changes give two hunks', () => {
    const b = [...ten]; b[0] = 'X'; b[9] = 'Y'
    expect(diffLines(ten.join('\n'), b.join('\n'))).toHaveLength(2)
  })
  it('changes within 2*context lines merge into one hunk', () => {
    const b = [...ten]; b[3] = 'X'; b[6] = 'Y'
    expect(diffLines(ten.join('\n'), b.join('\n'))).toHaveLength(1)
  })
  it('pure insertion and deletion', () => {
    expect(diffLines('a\nc', 'a\nb\nc')[0].lines.filter((l) => l.kind !== 'same')).toEqual([{ kind: 'add', text: 'b' }])
    expect(diffLines('a\nb\nc', 'a\nc')[0].lines.filter((l) => l.kind !== 'same')).toEqual([{ kind: 'del', text: 'b' }])
  })
  it('huge middle does not blow up', () => {
    const a = Array.from({ length: 5000 }, (_, i) => `a${i}`).join('\n')
    const b = Array.from({ length: 5000 }, (_, i) => `b${i}`).join('\n')
    const h = diffLines(a, b)
    expect(h.flatMap((x) => x.lines).filter((l) => l.kind === 'del')).toHaveLength(5000)
  })
})

/**
 * Reads JSON that is still being written, keeping whatever is there so far,
 * including a string cut off mid-word: `{"text":"You say the tru` reads as
 * { text: 'You say the tru' }. A key whose value has not started is left out.
 * Used to show a philosopher's words as they arrive.
 */
export function parsePartialJson(src: string): unknown {
  let i = 0
  const ws = () => {
    while (i < src.length && /\s/.test(src[i])) i++
  }
  const END = Symbol('end')
  type V = unknown | typeof END

  function str(): string {
    i++ // opening quote
    let out = ''
    while (i < src.length) {
      const c = src[i]
      if (c === '"') {
        i++
        return out
      }
      if (c === '\\') {
        const n = src[i + 1]
        if (n === undefined) break
        if (n === 'u') {
          const hex = src.slice(i + 2, i + 6)
          if (hex.length < 4) break
          out += String.fromCharCode(parseInt(hex, 16))
          i += 6
          continue
        }
        out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' } as Record<string, string>)[n] ?? n
        i += 2
        continue
      }
      out += c
      i++
    }
    i = src.length
    return out
  }

  function value(): V {
    ws()
    if (i >= src.length) return END
    const c = src[i]
    if (c === '{') {
      i++
      const obj: Record<string, unknown> = {}
      for (;;) {
        ws()
        if (i >= src.length) return obj
        if (src[i] === '}') {
          i++
          return obj
        }
        if (src[i] === ',') {
          i++
          continue
        }
        if (src[i] !== '"') return obj
        const key = str()
        ws()
        if (src[i] !== ':') return obj
        i++
        const v = value()
        if (v === END) return obj
        obj[key] = v
      }
    }
    if (c === '[') {
      i++
      const arr: unknown[] = []
      for (;;) {
        ws()
        if (i >= src.length) return arr
        if (src[i] === ']') {
          i++
          return arr
        }
        if (src[i] === ',') {
          i++
          continue
        }
        const v = value()
        if (v === END) return arr
        arr.push(v)
      }
    }
    if (c === '"') return str()
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(src.slice(i))
    if (!m) return END
    i += m[0].length
    // a number or word right at the end may still be growing
    if (i >= src.length && !/^(true|false|null)$/.test(m[0])) return END
    return JSON.parse(m[0])
  }

  const v = value()
  return v === END ? undefined : v
}

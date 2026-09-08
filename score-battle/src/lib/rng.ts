/** 룰렛에만 쓰는 난수. 브라우저 CSPRNG 로 뽑고, 없으면 Math.random 으로 물러선다. */
export const randomIndex = (length: number): number => {
  if (length <= 0) return -1
  const crypto = globalThis.crypto
  if (crypto?.getRandomValues) {
    const buf = new Uint32Array(1)
    const limit = Math.floor(0xffffffff / length) * length
    let v = 0
    do {
      crypto.getRandomValues(buf)
      v = buf[0]
    } while (v >= limit)
    return v % length
  }
  return Math.floor(Math.random() * length)
}

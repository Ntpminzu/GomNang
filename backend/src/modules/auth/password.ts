import { randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Băm mật khẩu bằng scrypt.
 *
 * Vì sao scrypt: có sẵn trong node:crypto nên không thêm thư viện nào, và tốn bộ nhớ theo thiết kế — đoán mật khẩu
 * hàng loạt bằng GPU đắt hơn nhiều so với băm nhanh kiểu SHA-256. Mỗi mật khẩu một salt ngẫu nhiên 16 byte, nên hai
 * người trùng mật khẩu vẫn ra hai chuỗi khác nhau.
 *
 * Chuỗi lưu có dạng `scrypt$N$r$p$<salt base64>$<hash base64>`. Tham số nằm ngay trong chuỗi: sau này tăng N cho
 * chậm hơn thì hash cũ vẫn kiểm được bằng tham số cũ của chính nó, không ai bị khoá tài khoản.
 */

const scryptAsync = promisify(scrypt) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

const N = 32768
const R = 8
const P = 1
const KEYLEN = 64
// scrypt dùng khoảng 128·N·r byte = 32 MiB với tham số trên, chạm đúng trần mặc định của Node nên phải nới.
const MAXMEM = 64 * 1024 * 1024

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM })
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$')
}

/** Sai mật khẩu hay chuỗi lưu bị hỏng đều trả `false`, không ném lỗi. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [n, r, p] = parts.slice(1, 4).map(Number)
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  if (salt.length === 0 || expected.length !== KEYLEN) return false

  try {
    const actual = await scryptAsync(plain, salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM })
    return timingSafeEqual(actual, expected)
  } catch {
    // N, r, p không hợp lệ (không phải số, N không phải luỹ thừa của 2, vượt MAXMEM) — scrypt từ chối.
    return false
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { safeFileName, sniffReceiptType } from './files.ts'

const bytes = (...values: number[]) => Uint8Array.from(values)

test('nhận loại chứng từ theo byte đầu file, không theo tên hay Content-Type', () => {
  assert.equal(sniffReceiptType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg')
  assert.equal(sniffReceiptType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), 'image/png')
  assert.equal(sniffReceiptType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)), 'image/webp')
  assert.equal(sniffReceiptType(new TextEncoder().encode('%PDF-1.7')), 'application/pdf')
  assert.equal(sniffReceiptType(new TextEncoder().encode('<svg onload=alert(1)>')), null)
  assert.equal(sniffReceiptType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)), null, 'RIFF nhưng là WAV')
  assert.equal(sniffReceiptType(bytes()), null)
})

test('tên file hiển thị: bỏ đường dẫn, ký tự điều khiển và dấu nháy; rỗng thì có tên mặc định', () => {
  assert.equal(safeFileName('C:\\Users\\mai\\hoá đơn.png'), 'hoá đơn.png')
  assert.equal(safeFileName('../../etc/passwd'), 'passwd')
  assert.equal(safeFileName('a"b\u0000c.pdf'), 'abc.pdf')
  assert.equal(safeFileName('   '), 'chung-tu')
  assert.equal(safeFileName('x'.repeat(300)).length, 120)
})

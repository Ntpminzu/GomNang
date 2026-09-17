import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Run against a running frontend: node fe/tests/typography.browser.mjs
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const origin = process.env.UI_TEST_URL ?? 'http://127.0.0.1:3000'
  const output = new URL('../test-results/typography/', import.meta.url)
  await mkdir(output, { recursive: true })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin)
    await page.locator('#hero-title').waitFor()
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('#hero-title').textContent(), '\u0110i\u1ec1u t\u1ed1t \u0111\u1eb9p b\u1eaft \u0111\u1ea7ut\u1eeb m\u1ed9t ch\u00fat s\u1ebb chia.')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`)
    const { root } = await cdp.send('DOM.getDocument')
    for (const selector of ['#hero-title', '#hero-title em', '.art-note span', '.hero-copy > p:not(.eyebrow)', '.eyebrow']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      assert.ok(fonts.length > 0, `No rendered font: ${selector}`)
      assert.ok(fonts.every(font => font.isCustomFont && /Lora|BeVietnamPro|Be Vietnam Pro/.test(font.familyName)), `Unexpected glyph fallback in ${selector}: ${JSON.stringify(fonts)}`)
    }
    await page.screenshot({ path: fileURLToPath(new URL(`home-${width}.png`, output)), fullPage: true })
    console.log(`PASS: Vietnamese web fonts and layout at ${width}px`)
  }
} finally {
  await browser.close()
}

const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  // Enable console logging
  page.on('console', (msg) => {
    console.log(`Console ${msg.type()}: ${msg.text()}`)
  })

  page.on('pageerror', (error) => {
    console.log('Page error:', error.message)
  })

  try {
    // Navigate to the app
    await page.goto('http://localhost:3210')

    // Wait a bit
    await page.waitForTimeout(3000)

    // Try clicking on first session
    const sessionLink = await page.$('.session-header a')
    if (sessionLink) {
      console.log('Found session link, clicking...')
      await sessionLink.click()
      await page.waitForTimeout(3000)
      console.log('Current URL after click:', page.url())
    } else {
      console.log('No session link found')
    }

    // Keep browser open for manual inspection
    await page.waitForTimeout(30000)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
})()

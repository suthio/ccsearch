const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  // Capture console messages
  const consoleMessages = []
  page.on('console', (msg) => {
    const message = `${msg.type()}: ${msg.text()}`
    console.log('Console', message)
    consoleMessages.push(message)
  })

  page.on('pageerror', (error) => {
    console.log('Page error:', error.message)
    consoleMessages.push(`error: ${error.message}`)
  })

  try {
    console.log('Going to main page...')
    await page.goto('http://localhost:3210')
    await page.waitForTimeout(5000)

    // Check page content
    const html = await page.content()
    console.log('\nPage HTML length:', html.length)
    console.log('Has #root element:', html.includes('id="root"'))

    // Check if React mounted
    const rootContent = await page
      .$eval('#root', (el) => el.innerHTML)
      .catch(() => 'No #root found')
    console.log('Root element content length:', rootContent.length)

    // Take screenshot
    await page.screenshot({ path: 'screenshot-debug.png' })

    console.log('\nAll console messages:')
    consoleMessages.forEach((msg) => console.log(msg))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(10000) // Keep open for manual inspection
    await browser.close()
  }
})()

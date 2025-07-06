const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Listen for console messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text())
    }
  })

  // Listen for page errors
  page.on('pageerror', (error) => {
    console.log('Page error:', error.message)
  })

  try {
    // Navigate to the app
    await page.goto('http://localhost:3210')
    await page.waitForTimeout(2000)

    console.log('Page title:', await page.title())
    console.log('Page URL:', page.url())

    // Check if there's any content
    const content = await page.content()
    console.log('Content length:', content.length)

    // Try to find the root element
    const root = await page.$('#root')
    if (root) {
      const rootContent = await root.innerHTML()
      console.log('Root element content:', rootContent.substring(0, 200))
    } else {
      console.log('Root element not found')
    }

    // Navigate to detail page
    console.log('\nNavigating to detail page...')
    await page.goto('http://localhost:3210/session/a88a54f0')
    await page.waitForTimeout(2000)

    console.log('Detail page URL:', page.url())
    const detailContent = await page.content()
    console.log('Detail content length:', detailContent.length)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
})()

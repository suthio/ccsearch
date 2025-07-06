import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Claude Chat Search/)
})

test('search box is visible', async ({ page }) => {
  await page.goto('/')
  const searchBox = page.getByPlaceholder('Search sessions...')
  await expect(searchBox).toBeVisible()
})

test('language switcher is present', async ({ page }) => {
  await page.goto('/')
  const langSwitcher = page.getByRole('button', { name: /EN|日本語/ })
  await expect(langSwitcher).toBeVisible()
})

test('dark mode toggle works', async ({ page }) => {
  await page.goto('/')
  const darkModeToggle = page.getByRole('button', { name: /Toggle dark mode/ })
  await expect(darkModeToggle).toBeVisible()

  // Check initial state
  const htmlElement = page.locator('html')
  const initialClass = await htmlElement.getAttribute('class')

  // Click toggle
  await darkModeToggle.click()

  // Check if class changed
  const afterClass = await htmlElement.getAttribute('class')
  expect(afterClass).not.toBe(initialClass)
})

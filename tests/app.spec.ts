import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('CC Search')
})

test('search box is visible', async ({ page }) => {
  await page.goto('/')
  const searchBox = page.locator('input#searchInput')
  await expect(searchBox).toBeVisible()
})

test('search functionality works', async ({ page }) => {
  await page.goto('/')
  const searchBox = page.locator('input#searchInput')
  const searchButton = page.locator('button#searchButton')
  
  await expect(searchBox).toBeVisible()
  await expect(searchButton).toBeVisible()
  
  // Type in search box
  await searchBox.fill('test query')
  await expect(searchBox).toHaveValue('test query')
})

test('page loads without errors', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  
  await page.goto('/')
  
  // Wait for the app to load
  await page.waitForSelector('#searchInput', { timeout: 10000 })
  
  // Check no console errors
  expect(errors).toHaveLength(0)
})

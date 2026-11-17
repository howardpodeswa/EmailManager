import { expect, test } from '@playwright/test'

/**
 * Smoke test for milestone 1: sign in through the NODE_ENV=test-only route, then check the Inbox
 * renders the fake provider's threads and pages with Load more. No Google, no real mailbox.
 */
const TEST_SIGN_IN_URL = '/api/emailmanager-core/auth/test/sign-in'
const uniqueEmail = (): string => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

test('shows the sign-in screen with the AI notice when signed out', async ({ page }) => {
  await page.goto('/inbox')
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible()
  await expect(page.getByTestId('ai-notice')).toContainText('uses AI')
})

test('signs in and renders the inbox with paging', async ({ page }) => {
  const email = uniqueEmail()
  // page.request shares the browser context's cookie jar, so the session cookie lands in the browser
  const signIn = await page.request.post(TEST_SIGN_IN_URL, { data: { email } })
  expect(signIn.ok()).toBe(true)

  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  await expect(page.getByTestId('signed-in-email')).toHaveText(email)

  const rows = page.getByTestId('thread-row')
  await expect(rows).toHaveCount(25)
  await expect(rows.first()).toContainText('Quarterly planning notes #1')
  await expect(rows.first()).toContainText('Avery Chen')
  await expect(page.getByTestId('ai-notice')).toBeVisible()

  await page.getByTestId('load-more').click()
  await expect(rows).toHaveCount(50)
  await page.getByTestId('load-more').click()
  // The fake mailbox has 60 threads, so the third page is the last
  await expect(rows).toHaveCount(60)
  await expect(page.getByTestId('load-more')).toHaveCount(0)

  // Placeholder screens are reachable from the nav
  await page.getByRole('link', { name: 'To Respond' }).click()
  await expect(page.getByRole('heading', { name: 'To Respond' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.goto('/inbox')
  await expect(page).toHaveURL(/\/sign-in$/)
})

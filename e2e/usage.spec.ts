import { expect, type Page, test } from '@playwright/test'
import { getTestEnv, loginUrl, rcloneRC } from './helpers'

test.beforeAll(async () => {
    await rcloneRC('/config/create', { name: 'test-usage', type: 'local', parameters: {} })
})

test.afterAll(async () => {
    await rcloneRC('/config/delete', { name: 'test-usage' })
})

function countAboutRequests(page: Page) {
    const fsParams: string[] = []
    page.on('request', (request) => {
        const url = new URL(request.url())
        if (url.pathname.endsWith('/operations/about')) {
            fsParams.push(url.searchParams.get('fs') ?? '')
        }
    })
    return fsParams
}

async function openRemotesPage(page: Page) {
    const { appUrl } = getTestEnv()
    await page.goto(loginUrl())
    await page.waitForURL(appUrl + '/')
    await page.goto(appUrl + '/remotes')
    const row = page
        .getByRole('row')
        .filter({ has: page.getByRole('link', { name: 'test-usage' }) })
    await expect(row).toBeVisible()
    return row
}

test('does not check remote usage unless enabled', async ({ page }) => {
    const aboutRequests = countAboutRequests(page)
    const row = await openRemotesPage(page)
    await page.waitForTimeout(1000)
    expect(aboutRequests).toEqual([])
    await expect(row.getByText('--', { exact: true })).toBeVisible()
})

test('checks remote usage once enabled in settings', async ({ page }) => {
    const aboutRequests = countAboutRequests(page)
    await openRemotesPage(page)
    await page.locator('header img').first().click()
    await page.getByRole('switch', { name: 'Check usage automatically' }).click()
    await expect.poll(() => aboutRequests).toContain('test-usage:')
})

import { expect, test, type Page } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;
const ENDPOINT_ID = 'mock-graphql-' + Math.random().toString(36).substring(7);

test.use({ baseURL: 'http://localhost:5173' });

const registerEndpoint = async (page: Page, url: string): Promise<void> => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', url);
	await page.click('button:has-text("Save")');
	const card = page.locator('.card', { hasText: ENDPOINT_ID }).filter({ visible: true });
	await expect(card).toBeVisible();
	await card.click();
    // Wait for navigation and schema loading
    await page.waitForURL(/\/endpoints\/.*\/explorer/);
	await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 20000 });
};

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	if (mockServer) await mockServer.close();
});

test('can modify inputs and add nested arguments', async ({ page }) => {
    await registerEndpoint(page, mockServer.url);

    // Navigate to items query
    await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);

    // Wait until the query builder is ready
    const plusBtn = page.locator('.bi-plus-circle').first();
    await expect(plusBtn).toBeVisible({ timeout: 20000 });

    // 2. Add an argument
    await plusBtn.click();

    // Add 'filter' argument
    const filterOption = page.locator('button:has-text("filter")');
    await expect(filterOption).toBeVisible();
    await filterOption.click();

    // 3. Modify the input field
    const input = page.locator('input.input-bordered').first();
    await expect(input).toBeVisible();
    await input.fill('Alpha');
    await page.keyboard.press('Enter');

    // 4. Verify the input value is preserved
    await expect(input).toHaveValue('Alpha');

    // 5. Test that we can still interact with the page (no blocking overlay)
    const qmsBodyBtn = page.locator('button:has-text("QMS body")');
    await expect(qmsBodyBtn).toBeVisible();
    await qmsBodyBtn.click();

    // Verify QMS body is displayed
    await expect(page.locator('pre')).toBeVisible();
});

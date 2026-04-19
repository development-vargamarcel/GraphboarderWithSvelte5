import { expect, test } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;
const ENDPOINT_ID = 'repro-endpoint';

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	await mockServer.close();
});

test('filtering a query via funnel in Add Column dropdown works', async ({ page }) => {
	await page.goto('/endpoints');

	// Add mock endpoint
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', mockServer.url);
	await page.click('button:has-text("Save")');

	const card = page.locator('.card', { hasText: ENDPOINT_ID }).filter({ visible: true });
	await expect(card).toBeVisible();
	await card.click();

    // Wait for schema
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 20000 });

	// Go to items query
    await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);

	// Open Add Column dropdown
	await page.getByTestId('add-column-button').first().click();

	// Find the funnel button for 'name' field using test id
	const funnelButton = page.getByTestId('funnel-button-name').first();
    await funnelButton.click();

    // Now the modal should be open
    const modal = page.locator('dialog.modal').filter({ hasText: /name/ }).first();
    await expect(modal).toBeVisible();

    // In the modal, find the 'uppercase' argument and set it to true using test id
    const toggle = modal.getByTestId('toggle-uppercase').first();
    await expect(toggle).toBeVisible();
    await toggle.click({ force: true });

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Open QMS body
    await page.click('button:has-text("QMS body")');

    // Check if the generated query contains (uppercase: true)
    const qmsBody = page.locator('pre.hljs');
    await expect(qmsBody).toContainText('name(uppercase: true)');

    // Check if table reflects changes (Alpha -> ALPHA)
    await expect(page.locator('td', { hasText: 'ALPHA' }).first()).toBeVisible({ timeout: 10000 });
});

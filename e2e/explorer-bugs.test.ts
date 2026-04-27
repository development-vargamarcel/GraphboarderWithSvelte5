import { expect, test } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;
const ENDPOINT_ID = 'explorer-repro';

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	await mockServer.close();
});

test('Explorer: filtering, navigation and funnel works', async ({ page }) => {
    test.setTimeout(60000);
	await page.goto('/endpoints');

	// Add mock endpoint
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', mockServer.url);
	await page.click('button[data-slot="button"]:has-text("Save")');

	const card = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID }).filter({ visible: true });
	await expect(card).toBeVisible();
	await card.click();

    // Wait for schema
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 60000 });

	// Go to Explorer
    await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

    // The "Queries" button might be in the sidebar or main area.
    // In explorer page, they are in the top toolbar.
    const queriesBtn = page.getByRole('button', { name: 'Queries', exact: true }).filter({ visible: true }).first();
    await expect(queriesBtn).toBeVisible();
    await queriesBtn.click();

    const explorerBtn = page.getByRole('button', { name: 'Explorer', exact: true }).filter({ visible: true }).first();
    await expect(explorerBtn).toBeVisible();
    await explorerBtn.click();

    // Now types should be visible in the explorer list
    await expect(page.locator('text=items').first()).toBeVisible();

    // Reproduce Filtering Bug:
    // 1. Filter for "items"
    await page.fill('input[placeholder="Filter (e.g. +user -id)"]', 'items');
    await expect(page.getByTestId('type-container-items')).toBeVisible();
    await expect(page.getByTestId('type-container-users')).toBeHidden();

    // Check for funnel icon on "items" (it should have arguments in mock server)
    const funnelButton = page.getByTestId('funnel-button-items-DEFAULT').first();
    await expect(funnelButton).toBeVisible();

    // 2. Filter for "users"
    await page.fill('input[placeholder="Filter (e.g. +user -id)"]', 'users');
    await expect(page.getByTestId('type-container-users')).toBeVisible();
    await expect(page.getByTestId('type-container-items')).toBeHidden();

    // Clear filter
    await page.fill('input[placeholder="Filter (e.g. +user -id)"]', '');
    await expect(page.getByTestId('type-container-items')).toBeVisible();

    // Reproduce Navigation Bug: Try to expand "items"
    const itemsContainer = page.getByTestId('type-container-items').first();
    const expandButton = itemsContainer.locator('button:has-text("+")').first();

    // Attempt click (without force first, to see if it still fails)
    await expandButton.click();

    // If it works, we should see fields of "items" (e.g., "id", "name")
    await expect(page.locator('text=name').first()).toBeVisible();
});

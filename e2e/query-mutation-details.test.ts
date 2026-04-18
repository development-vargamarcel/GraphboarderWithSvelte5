import { expect, test } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;

/**
 * Helper to register the mock GraphQL endpoint in the application.
 */
const registerMockEndpoint = async (page: any, url: string) => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', 'mock-graphql');
	await page.fill('input[placeholder="https://example.com/graphql"]', url);
	await page.click('button:has-text("Save")');

    const card = page.locator('.card', { hasText: 'mock-graphql' }).filter({ visible: true });
	await expect(card).toBeVisible();
    await card.click();

    // Wait for the loading spinner to disappear (introspection)
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 20000 });
};

/**
 * Helper to remove the mock GraphQL endpoint after tests.
 */
const removeMockEndpoint = async (page: any) => {
    try {
        await page.goto('/endpoints');
        const deleteCard = page.locator('.card', { hasText: 'mock-graphql' }).filter({ visible: true });
        if (await deleteCard.isVisible()) {
            await deleteCard.hover();
            await deleteCard.locator('button[title="Delete Endpoint"]').click();
            await page.click('button:has-text("Confirm")');
            await expect(page.locator('text=mock-graphql')).not.toBeVisible();
        }
    } catch (e) {
        // Cleanup errors are usually non-fatal
    }
};

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	await mockServer.close();
});

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
	await registerMockEndpoint(page, mockServer.url);
});

test.afterEach(async ({ page }) => {
	await removeMockEndpoint(page);
});

test('column management: add and remove columns', async ({ page }) => {
    const endpointId = 'mock-graphql';
    await page.goto(`/endpoints/${endpointId}/queries/items`);

    const addColBtn = page.locator('.bi-node-plus-fill').first();
    await expect(addColBtn).toBeVisible({ timeout: 20000 });

	// Add "id" column
    await addColBtn.click();
	const addColumnInput = page.locator('.dropdown-content input[placeholder*="producer>films>title"]').first();
    await expect(addColumnInput).toBeVisible();
	await addColumnInput.fill('id');
	await addColumnInput.press('Enter');

	// Verify "id" column header exists
	await expect(page.locator('th', { hasText: 'id' }).first()).toBeVisible({ timeout: 10000 });

	// Remove "id" column via header dropdown
	const idHeader = page.locator('th', { hasText: 'id' }).first();
	await idHeader.locator('.bi-chevron-down').click();
	await page.click('text=hide field');

	// Verify "id" column is gone
	await expect(page.locator('th', { hasText: 'id' }).first()).not.toBeVisible();
});

test('query filtering: open modal and set argument', async ({ page }) => {
    const endpointId = 'mock-graphql';
    await page.goto(`/endpoints/${endpointId}/queries/items`);

	await page.locator('.bi-node-plus-fill').first().click();

	// Click funnel for items field in the "Add Column" dropdown
	const itemsRow = page.locator('.dropdown-content div').filter({ hasText: /^items$/ }).first();
	await expect(itemsRow).toBeVisible();

    const funnelBtn = itemsRow.locator('.bi-funnel, .bi-funnel-fill').first();
    await expect(funnelBtn).toBeVisible();
    await funnelBtn.click();

	// Argument Modal should be visible
	await expect(page.locator('.modal-box')).toBeVisible();

	// Fill filter input (implemented via Interface.svelte)
	const filterInput = page.locator('.modal-box input').first();
    await expect(filterInput).toBeVisible();
	await filterInput.fill('Alpha');

	// Close modal via Escape key
	await page.keyboard.press('Escape');
	await expect(page.locator('.modal-box')).not.toBeVisible();

	// Verify the table only shows filtered result
	await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
	await expect(page.locator('td', { hasText: 'Beta' }).first()).not.toBeVisible();
});

test('mutation: build and submit', async ({ page }) => {
    const endpointId = 'mock-graphql';
    await page.goto(`/endpoints/${endpointId}/mutations/addItem`);

	// Fill mutation arguments (name)
	const nameInput = page.locator('input[placeholder="name"], .modal-box input, main#page input').first();
	await expect(nameInput).toBeVisible({ timeout: 20000 });
	await nameInput.fill('New Item');

	await page.click('button:has-text("submit")');

	// Verify success in the result table
	await expect(page.locator('td', { hasText: 'New Item' }).first()).toBeVisible({ timeout: 20000 });
});

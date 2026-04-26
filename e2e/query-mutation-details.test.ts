import { expect, test } from '@playwright/test';

const ENDPOINT_URL = 'http://localhost:5173/api/mock-graphql';
const ENDPOINT_ID = 'mock-graphql';

const registerMockEndpoint = async (page: any) => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', ENDPOINT_URL);
	await page.click('button[data-slot="button"]:has-text("Save")');

    const card = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID }).filter({ visible: true });
	await expect(card).toBeVisible();
    await card.click();

    // Wait for the loading spinner to disappear (introspection)
    await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 60000 });
};

const removeMockEndpoint = async (page: any) => {
	await page.goto('/endpoints');
    const card = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID }).filter({ visible: true });
    if (await card.isVisible()) {
        await card.hover();
        await card.locator('button[title="Delete"]').click();
        await page.click('button[data-slot="button"]:has-text("Confirm")');
        await expect(page.locator('text=' + ENDPOINT_ID)).not.toBeVisible();
    }
};

test.beforeEach(async ({ page }) => {
	await registerMockEndpoint(page);
});

test.afterEach(async ({ page }) => {
	await removeMockEndpoint(page);
});

test('column management: add and remove columns', async ({ page }) => {
    const endpointId = ENDPOINT_ID;
    await page.goto('/endpoints/' + endpointId + '/queries/items');

    const addColBtn = page.locator('[data-testid="add-column-button"]').first();
    await expect(addColBtn).toBeVisible({ timeout: 60000 });

	// Add "id" column via input
	const addColumnInput = page.locator('[data-testid="add-column-dropdown"] input[placeholder*="producer>films>title"]').first();
    await addColBtn.click();
    await addColumnInput.fill('id');
    await page.keyboard.press('Enter');

    // Verify "id" column is added to the table
    await expect(page.locator('th').filter({ hasText: 'id' }).first()).toBeVisible();

	// Remove "id" column via header dropdown
	const idHeader = page.locator('th', { hasText: 'id' }).first();
	await idHeader.locator('.bi-chevron-down, svg.lucide-chevron-down').click();
	await page.click('text=Hide field');

	// Verify "id" column is gone
	await expect(page.locator('th').filter({ hasText: 'id' })).not.toBeVisible();
});

test('query filtering: open modal and set argument', async ({ page }) => {
    const endpointId = ENDPOINT_ID;
    await page.goto('/endpoints/' + endpointId + '/queries/items');

	await page.locator('[data-testid="add-column-button"]').first().click();

	// Click funnel for items field in the "Add Column" dropdown
	const itemsRow = page.locator('[data-testid="add-column-dropdown"] div').filter({ hasText: /^items$/ }).first();
	await expect(itemsRow).toBeVisible();

    const funnelBtn = itemsRow.locator('.bi-funnel, .bi-funnel-fill, i.bi-funnel').first();
    await expect(funnelBtn).toBeVisible();
    await funnelBtn.click();

    // Verify modal is open
    await expect(page.locator('[data-slot="drawer-content"]').first()).toBeVisible();
    await expect(page.locator('[data-slot="drawer-content"]').first()).toContainText('items');
});

test('mutation: build and submit', async ({ page }) => {
    const endpointId = ENDPOINT_ID;
    await page.goto('/endpoints/' + endpointId + '/mutations/addItem');

	// Fill mutation arguments (name)
	const nameInput = page.locator('input[placeholder="name"], [data-slot="drawer-content"] input, main#page input').first();
	await expect(nameInput).toBeVisible({ timeout: 60000 });
	await nameInput.fill('New Item');

	await page.click('button:has-text("submit")');

	// Verify result (mock server returns the item with name)
	await expect(page.locator('text=New Item')).toBeVisible({ timeout: 60000 });
});

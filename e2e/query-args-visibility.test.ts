import { expect, test } from '@playwright/test';

const ENDPOINT_URL = 'http://localhost:5173/api/mock-graphql';
const ENDPOINT_ID = 'mock-graphql';

const registerMockEndpoint = async (page: any) => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', ENDPOINT_URL);
	await page.click('button[data-slot="button"]:has-text("Save")');
	await expect(page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID })).toBeVisible();
};

const removeMockEndpoint = async (page: any) => {
	const deleteCard = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID });
	await deleteCard.hover();
	await deleteCard.locator('button[title="Delete"]').click();
	await page.click('button[data-slot="button"]:has-text("Confirm")');
	await expect(page.locator('text=' + ENDPOINT_ID)).not.toBeVisible();
};

test.beforeEach(async ({ page }) => {
	await registerMockEndpoint(page);
});

test.afterEach(async ({ page }) => {
	await removeMockEndpoint(page);
});

// The mock schema has: items(filter: String): [Item!]!
// "items" has an argument (filter) and return type fields (id, name, createdAt).

test('add-column dropdown shows root query even when no columns are selected', async ({ page }) => {
	await page.goto('/endpoints/' + ENDPOINT_ID + '/queries/items');

	// Open the add-column dropdown
	await page.locator('[data-testid="add-column-button"]').first().click();

	const dropdown = page.locator('[data-testid="add-column-dropdown"]').first();
	await expect(dropdown).toBeVisible();

	// The root query entry "items" must be visible inside the dropdown
	// because it can accept arguments, even if no fields are selected yet.
	await expect(dropdown.locator('text=items').first()).toBeVisible();
});

test('funnel button is visible on a query with args and no columns selected', async ({ page }) => {
	await page.goto('/endpoints/' + ENDPOINT_ID + '/queries/items');

	// Open the add-column dropdown
	await page.locator('[data-testid="add-column-button"]').first().click();

	const dropdown = page.locator('[data-testid="add-column-dropdown"]').first();
	await expect(dropdown).toBeVisible();

	// The funnel button (argument modifier) must be visible on the "items" query row
	const itemsRow = dropdown.locator('div').filter({ hasText: /^items$/ }).first();
	await expect(itemsRow.locator('.bi-funnel, .bi-funnel-fill')).toBeVisible();
});

test('clicking funnel button opens the args modal', async ({ page }) => {
	await page.goto('/endpoints/' + ENDPOINT_ID + '/queries/items');

	// Open the add-column dropdown
	await page.locator('[data-testid="add-column-button"]').first().click();

	const dropdown = page.locator('[data-testid="add-column-dropdown"]').first();
	await expect(dropdown).toBeVisible();

	// Find the funnel button for 'items' and click it
	const itemsRow = dropdown.locator('div').filter({ hasText: /^items$/ }).first();
	await itemsRow.locator('.bi-funnel, .bi-funnel-fill').first().click();

	// A dialog (modal) should open
	const modal = page.locator('[data-slot="drawer-content"]').first();
	await expect(modal).toBeVisible();
	await expect(modal).toContainText('items');
});

test('clicking the group node button in the modal opens the inner editing modal', async ({
	page
}) => {
	await page.goto('/endpoints/' + ENDPOINT_ID + '/queries/items');

	// Open the add-column dropdown
	await page.locator('[data-testid="add-column-button"]').first().click();

	const dropdown = page.locator('[data-testid="add-column-dropdown"]').first();
	await expect(dropdown).toBeVisible();

	// Click funnel for items
	const itemsRow = dropdown.locator('div').filter({ hasText: /^items$/ }).first();
	await itemsRow.locator('.bi-funnel, .bi-funnel-fill').first().click();

	// The first open dialog is the outer args modal
	const outerDialog = page.locator('[data-slot="drawer-content"]').first();
	await expect(outerDialog).toBeVisible();

	// The main container node ("items") is rendered as a button — clicking it
	// should open the "Group Editing" modal where filters/args are actually added.
	const groupNodeBtn = outerDialog
		.locator('button[data-slot="button"]', { hasText: 'items' })
		.first();
	await groupNodeBtn.click();

	// A second (inner) dialog should now be open
	const innerDialog = page.locator('[data-slot="drawer-content"]').last();
	await expect(innerDialog).toBeVisible();
	await expect(innerDialog).toContainText('items');
});

test('clicking filter arg in inner modal adds it to DND zone and its value can be set', async ({
	page
}) => {
	await page.goto('/endpoints/' + ENDPOINT_ID + '/queries/items');

	// Open the add-column dropdown
	await page.locator('[data-testid="add-column-button"]').first().click();
	const dropdown = page.locator('[data-testid="add-column-dropdown"]').first();
	await expect(dropdown).toBeVisible();

	// Click funnel for items
	const itemsRow = dropdown.locator('div').filter({ hasText: /^items$/ }).first();
	await itemsRow.locator('.bi-funnel, .bi-funnel-fill').first().click();

	// The first open dialog is the outer args modal
	const outerDialog = page.locator('[data-slot="drawer-content"]').first();
	await expect(outerDialog).toBeVisible();

	// Click the "items" main node button to open the inner editing modal
	const groupNodeBtn = outerDialog.locator('button[data-slot="button"]', { hasText: 'items' }).first();
	await groupNodeBtn.click();

	// The inner editing dialog should be open (it's the last open dialog)
	const innerDialog = page.locator('[data-slot="drawer-content"]').last();
	await expect(innerDialog).toBeVisible();

	// Inside the inner modal, find and click the "filter" argument button to add it
	const filterArgBtn = innerDialog.locator('button', { hasText: 'filter' }).first();
	await filterArgBtn.click();

	// After clicking, the argument should be present in the DND zone of the OUTER modal
	// (Close the inner modal first if needed, but usually the UI allows seeing the update)
	await page.keyboard.press('Escape');

	const dndZone = page.locator('[data-slot="drawer-content"]').first().locator('section[role="list"]');
	await expect(dndZone.locator('text=filter')).toBeVisible();

	// Now try to set a value in the input
	const filterInput = dndZone.locator('input').first();
	await filterInput.fill('search-term');
	await expect(filterInput).toHaveValue('search-term');
});

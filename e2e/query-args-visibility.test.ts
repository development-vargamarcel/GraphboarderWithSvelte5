import { expect, test } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	await mockServer.close();
});

const registerMockEndpoint = async (page: any, url: string) => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', 'mock-graphql');
	await page.fill('input[placeholder="https://example.com/graphql"]', url);
	await page.click('button:has-text("Save")');
	await expect(page.locator('.card', { hasText: 'mock-graphql' })).toBeVisible();
};

const removeMockEndpoint = async (page: any) => {
	await page.goto('/endpoints');
	const deleteCard = page.locator('.card', { hasText: 'mock-graphql' });
	await deleteCard.hover();
	await deleteCard.locator('button[title="Delete Endpoint"]').click();
	await page.click('button:has-text("Confirm")');
	await expect(page.locator('text=mock-graphql')).not.toBeVisible();
};

// The mock schema has: items(filter: String): [Item!]!
// "items" has an argument (filter) and return type fields (id, name, createdAt).

test('add-column dropdown shows root query even when no columns are selected', async ({
	page
}) => {
	await registerMockEndpoint(page, mockServer.url);
	await page.goto('/endpoints/mock-graphql/queries/items');

	// Open the add-column dropdown (node-plus button)
	await page.locator('.bi-node-plus-fill').first().click();

	// The root query entry "items" must be visible inside the dropdown
	const dropdown = page.locator('.dropdown-content').first();
	await expect(dropdown).toBeVisible();
	await expect(dropdown.locator('text=items').first()).toBeVisible();

	await removeMockEndpoint(page);
});

test('funnel button is visible on a query with args and no columns selected', async ({ page }) => {
	await registerMockEndpoint(page, mockServer.url);
	await page.goto('/endpoints/mock-graphql/queries/items');

	// Open the add-column dropdown
	await page.locator('.bi-node-plus-fill').first().click();

	const dropdown = page.locator('.dropdown-content').first();
	await expect(dropdown).toBeVisible();

	// The funnel button (argument modifier) must be visible on the "items" query row
	// even though no columns have been added yet
	const funnelBtn = dropdown.locator('icon.bi-funnel, icon.bi-funnel-fill').first();
	await expect(funnelBtn).toBeVisible();

	await removeMockEndpoint(page);
});

test('clicking funnel button opens the args modal', async ({ page }) => {
	await registerMockEndpoint(page, mockServer.url);
	await page.goto('/endpoints/mock-graphql/queries/items');

	// Open the add-column dropdown
	await page.locator('.bi-node-plus-fill').first().click();

	const dropdown = page.locator('.dropdown-content').first();
	await expect(dropdown).toBeVisible();

	// Click the funnel button to open the ActiveArguments modal
	const funnelBtn = dropdown.locator('button:has(icon.bi-funnel), button:has(icon.bi-funnel-fill)').first();
	await funnelBtn.click();

	// The args modal should open — it contains an ActiveArguments section
	// The "filter" argument from the mock schema should be listed
	const dialog = page.locator('dialog[open]').last();
	await expect(dialog).toBeVisible();

	await removeMockEndpoint(page);
});

test('clicking the group node button in the modal opens the inner editing modal', async ({
	page
}) => {
	await registerMockEndpoint(page, mockServer.url);
	await page.goto('/endpoints/mock-graphql/queries/items');

	// Open the add-column dropdown
	await page.locator('.bi-node-plus-fill').first().click();

	const dropdown = page.locator('.dropdown-content').first();
	await expect(dropdown).toBeVisible();

	// Open the args modal via the funnel button
	const funnelBtn = dropdown
		.locator('button:has(icon.bi-funnel), button:has(icon.bi-funnel-fill)')
		.first();
	await funnelBtn.click();

	// The outer args dialog must be open
	const outerDialog = page.locator('dialog[open]').last();
	await expect(outerDialog).toBeVisible();

	// The modal shows an ActiveArgumentsGroupHasFilterOperators component.
	// The main container node ("items") is rendered as a button — clicking it
	// should open a secondary modal with addDefaultFields and other controls.
	const groupNodeBtn = outerDialog
		.locator('button.btn-ghost', { hasText: 'items' })
		.first();
	await groupNodeBtn.click();

	// A second (inner) dialog should now be open
	const innerDialog = page.locator('dialog[open]').last();
	await expect(innerDialog).toBeVisible({ timeout: 5000 });

	// The inner dialog should have the "addDefaultFields" button
	await expect(innerDialog.locator('button', { hasText: 'addDefaultFields' })).toBeVisible();

	await removeMockEndpoint(page);
});

test('clicking filter arg in inner modal adds it to DND zone and its value can be set', async ({
	page
}) => {
	await registerMockEndpoint(page, mockServer.url);
	await page.goto('/endpoints/mock-graphql/queries/items');

	// Open the add-column dropdown
	await page.locator('.bi-node-plus-fill').first().click();
	const dropdown = page.locator('.dropdown-content').first();
	await expect(dropdown).toBeVisible();

	// Open the args modal via the funnel button
	const funnelBtn = dropdown
		.locator('button:has(icon.bi-funnel), button:has(icon.bi-funnel-fill)')
		.first();
	await funnelBtn.click();

	// The first open dialog is the outer args modal
	const outerDialog = page.locator('dialog[open]').first();
	await expect(outerDialog).toBeVisible();

	// Click the "items" main node button to open the inner editing modal
	const groupNodeBtn = outerDialog.locator('button.btn-ghost', { hasText: 'items' }).first();
	await groupNodeBtn.click();

	// The inner editing dialog should be open (it's the last open dialog)
	const innerDialog = page.locator('dialog[open]').last();
	await expect(innerDialog).toBeVisible({ timeout: 5000 });

	// The "filter" arg button is listed in the inner modal — click it to add to DND zone
	const filterArgBtn = innerDialog.locator('button', { hasText: 'filter' }).first();
	await expect(filterArgBtn).toBeVisible();
	await filterArgBtn.click();

	// Close the inner dialog via the ✕ button
	await innerDialog.locator('button[aria-label="Close"]').click();

	// Wait for inner dialog to fully close (only outer args dialog remains)
	await expect(page.locator('dialog[open]')).toHaveCount(1, { timeout: 5000 });

	// The outer dialog DND zone (section[role="list"]) should now contain the filter arg
	const dndSection = page.locator('dialog[open]').first().locator('section[role="list"]').first();
	await expect(dndSection.locator('text=filter').first()).toBeVisible({ timeout: 5000 });

	// Click the "filter" arg name button in the DND zone to open its editing modal.
	// ActiveArgument renders the arg name as a button — clicking it opens showModal with AutoInterface.
	// Use force:true because the dialog transition may briefly mark the button inert.
	const filterArgNameBtn = dndSection.locator('button', { hasText: 'filter' }).first();
	await filterArgNameBtn.click({ force: true });

	// The arg editing modal is now the last open dialog and always shows AutoInterface
	const argEditModal = page.locator('dialog[open]').last();
	await expect(argEditModal).toBeVisible({ timeout: 5000 });

	// AutoInterface renders Interface.svelte which has input[placeholder=dd_displayName]
	const filterInput = argEditModal.locator('input[placeholder="filter"]');
	await expect(filterInput).toBeAttached({ timeout: 2000 });

	// Set a value for the filter argument.
	// Use force:true because stacked native dialogs can temporarily mark elements inert.
	await filterInput.fill('Alpha', { force: true });
	await expect(filterInput).toHaveValue('Alpha');

	await removeMockEndpoint(page);
});

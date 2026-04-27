/**
 * Full user-flow e2e tests covering:
 *
 * - Multi-column query results (id, name, createdAt)
 * - Argument filter: apply, change, and clear
 * - Mutation creates data visible in a subsequent query
 * - Single-item query with a required ID argument
 * - Explorer: root types, queries scope, type expansion, text filter
 * - Explorer: type JSON info modal (shows clean schema JSON, strips dd_* keys)
 * - Explorer: table view
 * - Copy introspection schema → success toast + valid clipboard content
 * - History: executed queries and mutations are recorded
 */

import { expect, test, type Page } from '@playwright/test';
import {
	startMockGraphqlServer,
	type MockGraphqlServer
} from '../src/lib/server/mockGraphqlServer';

// ─── Shared state ──────────────────────────────────────────────────────────────

let mockServer: MockGraphqlServer;
const ENDPOINT_ID = 'mock-graphql';

// ─── Page-level helpers ────────────────────────────────────────────────────────

/**
 * Registers the mock endpoint and waits for schema introspection to complete.
 */
const registerEndpoint = async (page: Page, url: string): Promise<void> => {
	await page.goto('/endpoints');
	await page.click('text=Add Endpoint');
	await page.fill('input[placeholder="my-endpoint"]', ENDPOINT_ID);
	await page.fill('input[placeholder="https://example.com/graphql"]', url);
	await page.click('button[data-slot="button"]:has-text("Save")');
	const card = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID }).filter({ visible: true });
	await expect(card).toBeVisible();
	await card.click();
	await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 60000 });
};

/**
 * Deletes the mock endpoint. Failures are swallowed so afterEach never breaks.
 */
const removeEndpoint = async (page: Page): Promise<void> => {
	try {
		await page.goto('/endpoints');
		const card = page.locator('[data-slot="card"]', { hasText: ENDPOINT_ID }).filter({ visible: true });
		if (await card.isVisible()) {
			await card.hover();
			await card.locator('button[title="Delete"]').click();
			await page.click('button[data-slot="button"]:has-text("Confirm")');
		}
	} catch {
		/* cleanup errors are non-fatal */
	}
};

/**
 * Opens the column-picker dropdown, types the field name, and confirms with
 * Enter. Asserts the column header appears in the results table.
 */
const addColumn = async (page: Page, fieldName: string): Promise<void> => {
	const addColBtn = page.locator('[data-testid="add-column-button"]').first();
	await expect(addColBtn).toBeVisible({ timeout: 60000 });
	await addColBtn.click();
	const input = page.locator('[data-testid="add-column-dropdown"] input').first();
	await expect(input).toBeVisible();
	await input.fill(fieldName);
	await input.press('Enter');
	await expect(page.locator('th', { hasText: fieldName }).first()).toBeVisible({ timeout: 10000 });
};

/**
 * Opens the argument modal for `queryName` via the funnel icon in the
 * column-picker dropdown and asserts the modal is visible.
 */
const openArgumentModal = async (page: Page, queryName: string): Promise<void> => {
	await page.locator('[data-testid="add-column-button"]').first().click();
	const funnelBtn = page.locator(`[data-testid="funnel-button-${queryName}-COL_ADD"]`).first();
	await expect(funnelBtn).toBeVisible();
	await funnelBtn.click();
	await expect(
		page.locator('[data-modal-identifier="activeArgumentsDataModal"]').filter({ visible: true })
	).toBeVisible();
};

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
	mockServer = await startMockGraphqlServer();
});

test.afterAll(async () => {
	await mockServer.close();
});

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 1000 });
	await registerEndpoint(page, mockServer.url);
});

test.afterEach(async ({ page }) => {
	await removeEndpoint(page);
});

// ─── 1. Full query flow ────────────────────────────────────────────────────────

test.describe('full query flow', () => {
	test('adds all three columns and displays both seeded items', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);

		await addColumn(page, 'id');
		await addColumn(page, 'name');
		await addColumn(page, 'createdAt');

		// All three column headers must be present
		await expect(page.locator('th', { hasText: 'id' }).first()).toBeVisible();
		await expect(page.locator('th', { hasText: 'name' }).first()).toBeVisible();
		await expect(page.locator('th', { hasText: 'createdAt' }).first()).toBeVisible();

		// Both seeded rows must appear
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Beta' }).first()).toBeVisible({ timeout: 10000 });
	});

	test('argument filter narrows results to matching items only', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');

		// Baseline: both items are visible
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Beta' }).first()).toBeVisible({ timeout: 10000 });

		// Apply filter for "Alpha"
		await openArgumentModal(page, 'items');
		const modal = page.locator('[data-modal-identifier="activeArgumentsDataModal"]').filter({ visible: true });
		await modal.locator('[data-testid="toggle-input-filter"]').first().fill('Alpha');
		await page.keyboard.press('Escape');

		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Beta' }).first()).not.toBeVisible();
	});

	test('changing the argument filter swaps the visible result set', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');

		// Set filter → Alpha
		await openArgumentModal(page, 'items');
		const modal = page.locator('[data-modal-identifier="activeArgumentsDataModal"]').filter({ visible: true });
		await modal.locator('[data-testid="toggle-input-filter"]').first().fill('Alpha');
		await page.keyboard.press('Escape');
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Beta' }).first()).not.toBeVisible();

		// Change filter → Beta
		await openArgumentModal(page, 'items');
		const input = modal.locator('[data-testid="toggle-input-filter"]').first();
		await input.clear();
		await input.fill('Beta');
		await page.keyboard.press('Escape');

		await expect(page.locator('td', { hasText: 'Beta' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).not.toBeVisible();
	});

	test('clearing the argument filter restores all results', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');

		// Apply filter so Beta disappears
		await openArgumentModal(page, 'items');
		const modal = page.locator('[data-modal-identifier="activeArgumentsDataModal"]').filter({ visible: true });
		await modal.locator('[data-testid="toggle-input-filter"]').first().fill('Alpha');
		await page.keyboard.press('Escape');
		await expect(page.locator('td', { hasText: 'Beta' }).first()).not.toBeVisible();

		// Clear filter
		await openArgumentModal(page, 'items');
		await modal.locator('[data-testid="toggle-input-filter"]').first().clear();
		await page.keyboard.press('Escape');

		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'Beta' }).first()).toBeVisible({ timeout: 10000 });
	});
});

// ─── 2. Mutation flow ──────────────────────────────────────────────────────────

test.describe('mutation flow', () => {
	test('addItem mutation result is immediately visible and appears in the items query', async ({
		page
	}) => {
		const uniqueName = `FlowItem-${Date.now()}`;

		// Execute mutation
		await page.goto(`/endpoints/${ENDPOINT_ID}/mutations/addItem`);
		const nameInput = page.locator('[data-testid="toggle-input-name"]').first();
		await expect(nameInput).toBeVisible({ timeout: 60000 });
		await nameInput.fill(uniqueName);
		await page.click('button:has-text("submit")');

		// Mutation result table shows the new item
		await expect(page.locator('td', { hasText: uniqueName }).first()).toBeVisible({
			timeout: 60000
		});

		// Same item must be returned by the items list query (server is stateful)
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');
		await expect(page.locator('td', { hasText: uniqueName }).first()).toBeVisible({
			timeout: 10000
		});
	});
});

// ─── 3. Single-item query ──────────────────────────────────────────────────────

test.describe('single-item query', () => {
	test('item query with id=1 returns Alpha', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/item`);

		// The required "id: ID!" argument input should be visible on the page
		const idInput = page.locator('[data-testid="toggle-input-id"]').first();
		await expect(idInput).toBeVisible({ timeout: 60000 });
		await idInput.fill('1');

		await addColumn(page, 'name');
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({ timeout: 10000 });
	});
});

// ─── 4. Explorer flow ─────────────────────────────────────────────────────────

test.describe('explorer flow', () => {
	test('root scope shows all schema types including Item and Query', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Root")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();

		await expect(page.locator('[data-slot="badge"]', { hasText: 'Item' }).first()).toBeVisible({
			timeout: 10000
		});
		await expect(page.locator('[data-slot="badge"]', { hasText: 'Query' }).first()).toBeVisible();
	});

	test('queries scope shows the items and item query fields', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Queries")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();

		await expect(page.locator('td', { hasText: 'items' }).first()).toBeVisible({
			timeout: 10000
		});
		await expect(page.locator('td', { hasText: 'item' }).first()).toBeVisible();
	});

	test('mutations scope shows the addItem mutation field', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Mutations")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();

		await expect(page.locator('td', { hasText: 'addItem' }).first()).toBeVisible({
			timeout: 10000
		});
	});

	test('expanding a type reveals its sub-fields', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Root")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();
		await expect(page.locator('button:has-text("+")').first()).toBeVisible({ timeout: 10000 });

		// Click the first enabled expand (+) button (non-scalar types only)
		const expandBtn = page.locator('button:has-text("+")').first();
		await expandBtn.click();

		// The button now shows "-" and sub-fields are rendered below
		await expect(page.locator('button:has-text("-")').first()).toBeVisible({ timeout: 30000 });
	});

	test('text filter narrows the visible type list', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Root")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();
		await expect(page.locator('td').first()).toBeVisible({ timeout: 10000 });
		const initialCount = await page.locator('td').count();

		await page.fill('input[placeholder="Filter (e.g. +user -id)"]', 'Item');
		await page.keyboard.press('Enter');

		const filteredCount = await page.locator('td').count();
		expect(filteredCount).toBeLessThan(initialCount);
		await expect(page.locator('td', { hasText: 'Item' }).first()).toBeVisible();
	});

	test('clicking {} opens the type JSON modal with schema data', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Root")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();
		await expect(
			page.locator('button[aria-label="Show type info as JSON"]').first()
		).toBeVisible({ timeout: 10000 });

		await page.locator('button[aria-label="Show type info as JSON"]').first().click();

		// Modal must open and contain a <pre> with JSON
		const modal = page.locator('[data-modal-identifier="typeJsonInfoModal"]').filter({ visible: true });
		await expect(modal).toBeVisible();
		await expect(modal.locator('pre')).toBeVisible();

		const json = await modal.locator('pre').textContent();
		// Standard GraphQL schema fields must be present
		expect(json).toContain('"name"');
		expect(json).toContain('"kind"');
		// Internal derived-data keys must be stripped
		expect(json).not.toContain('"dd_');

		// Closing the modal via the × button works
		await modal.locator('button[aria-label="Close"]').click();
		await expect(modal).not.toBeVisible();
	});

	test('type JSON modal for Item shows OBJECT kind and its fields', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Root")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Explorer' }).first().click();

		// Narrow to just the Item type so the first {} button is unambiguous
		await page.fill('input[placeholder="Filter (e.g. +user -id)"]', 'Item');
		await page.keyboard.press('Enter');

		await expect(
			page.locator('button[aria-label="Show type info as JSON"]').first()
		).toBeVisible({ timeout: 10000 });
		await page.locator('button[aria-label="Show type info as JSON"]').first().click();

		const modal = page.locator('[data-modal-identifier="typeJsonInfoModal"]').filter({ visible: true });
		await expect(modal.locator('h3', { hasText: 'type info' })).toBeVisible();

		const rawJson = await modal.locator('pre').textContent();
		const parsed = JSON.parse(rawJson ?? '{}');

		expect(parsed.name).toBe('Item');
		expect(parsed.kind).toBe('OBJECT');
		// Item has three fields: id, name, createdAt
		const fieldNames = parsed.fields?.map((f: { name: string }) => f.name) ?? [];
		expect(fieldNames).toContain('id');
		expect(fieldNames).toContain('name');
		expect(fieldNames).toContain('createdAt');

		await page.keyboard.press('Escape');
	});

	test('table view renders query fields in a sortable table', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/explorer`);

		await page.click('button:has-text("Queries")');
		await page.locator('div[role="tablist"] button').filter({ hasText: 'Table' }).first().click();

		// Table header and data rows must be present
		await expect(page.locator('th').first()).toBeVisible({ timeout: 10000 });
		await expect(page.locator('td', { hasText: 'items' }).first()).toBeVisible({
			timeout: 10000
		});
	});
});

// ─── 5. Copy introspection schema ─────────────────────────────────────────────

test.describe('copy introspection schema', () => {
	test('copy schema button shows a success toast', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		// Wait until the query builder is ready (schema loaded)
		await expect(page.locator('[data-testid="add-column-button"]').first()).toBeVisible({ timeout: 60000 });

		await page.click('button[aria-label="Copy Schema JSON"]');

		await expect(
			page.locator('text=Introspection schema copied to clipboard!')
		).toBeVisible({ timeout: 30000 });
	});

	test('clipboard contains valid GraphQL schema JSON with expected types', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await expect(page.locator('[data-testid="add-column-button"]').first()).toBeVisible({ timeout: 60000 });

		await page.click('button[aria-label="Copy Schema JSON"]');
		// Toast confirms the write succeeded
		await expect(
			page.locator('text=Introspection schema copied to clipboard!')
		).toBeVisible({ timeout: 30000 });

		const raw = await page.evaluate(() => navigator.clipboard.readText());
		const schema = JSON.parse(raw);

		// Standard introspection schema shape
		expect(schema).toHaveProperty('types');
		expect(Array.isArray(schema.types)).toBe(true);

		const typeNames: string[] = schema.types.map((t: { name: string }) => t.name);
		expect(typeNames).toContain('Item');
		expect(typeNames).toContain('Query');
		expect(typeNames).toContain('Mutation');
	});
});

// ─── 6. History tracking ──────────────────────────────────────────────────────

test.describe('history tracking', () => {
	test('executing a query records it in the history page', async ({ page }) => {
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');
		// Wait until results are displayed so the query has definitely run
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({
			timeout: 10000
		});

		await page.goto(`/endpoints/${ENDPOINT_ID}/history`);
		await expect(page.locator('text=items')).toBeVisible({ timeout: 10000 });
	});

	test('executing a mutation records it in the history page', async ({ page }) => {
		const uniqueName = `HistTest-${Date.now()}`;
		await page.goto(`/endpoints/${ENDPOINT_ID}/mutations/addItem`);
		const nameInput = page.locator('[data-testid="toggle-input-name"]').first();
		await expect(nameInput).toBeVisible({ timeout: 60000 });
		await nameInput.fill(uniqueName);
		await page.click('button:has-text("submit")');
		await expect(page.locator('td', { hasText: uniqueName }).first()).toBeVisible({
			timeout: 60000
		});

		await page.goto(`/endpoints/${ENDPOINT_ID}/history`);
		await expect(page.locator('text=addItem')).toBeVisible({ timeout: 10000 });
	});

	test('history page correctly distinguishes query and mutation types', async ({ page }) => {
		// Run a query
		await page.goto(`/endpoints/${ENDPOINT_ID}/queries/items`);
		await addColumn(page, 'name');
		await expect(page.locator('td', { hasText: 'Alpha' }).first()).toBeVisible({
			timeout: 10000
		});

		// Run a mutation
		const uniqueName = `TypeTest-${Date.now()}`;
		await page.goto(`/endpoints/${ENDPOINT_ID}/mutations/addItem`);
		const nameInput = page.locator('[data-testid="toggle-input-name"]').first();
		await expect(nameInput).toBeVisible({ timeout: 60000 });
		await nameInput.fill(uniqueName);
		await page.click('button:has-text("submit")');
		await expect(page.locator('td', { hasText: uniqueName }).first()).toBeVisible({
			timeout: 60000
		});

		// History should list both operations
		await page.goto(`/endpoints/${ENDPOINT_ID}/history`);
		await expect(page.locator('text=items')).toBeVisible({ timeout: 10000 });
		await expect(page.locator('text=addItem')).toBeVisible({ timeout: 10000 });

		// Filtering by type works: "query" shows items but not addItem
		await page.selectOption('select', { value: 'query' });
		await expect(page.locator('text=items')).toBeVisible();
		await expect(page.locator('text=addItem')).not.toBeVisible();

		// Filtering by "mutation" shows addItem but not items
		await page.selectOption('select', { value: 'mutation' });
		await expect(page.locator('text=addItem')).toBeVisible();
		await expect(page.locator('text=items')).not.toBeVisible();
	});
});

import { expect, test } from '@playwright/test';

test.describe('Endpoints Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/endpoints');
	});

	test('should display default endpoints', async ({ page }) => {
		await expect(page.locator('text=Select an Endpoint')).toBeVisible();
	});

	test('should add, edit and delete a user endpoint', async ({ page }) => {
		// 1. Add Endpoint
		await page.click('text=Add Endpoint');
		// The modal content might be in the drawer
		await expect(page.locator('h2:has-text("Add new Endpoint")')).toBeVisible();

		await page.fill('input[placeholder="my-endpoint"]', 'test-endpoint');
		await page.fill('input[placeholder="https://example.com/graphql"]', 'https://test.com/graphql');

		await page.click('button:has-text("Save")');

		// Verify added - updated selector from .card to something that matches Shadcn Card
		// Shadcn Card usually has class 'border', 'rounded-xl', etc. or we can use data-testid if we added it.
		// For now let's use text content.
		const newCard = page.locator('div', { hasText: 'test-endpoint' }).filter({ hasText: 'User Defined' }).first();
		await expect(newCard).toBeVisible();

		// 2. Edit Endpoint
		const editBtn = newCard.locator('button[title="Edit Endpoint"]');
		await newCard.hover();
		await editBtn.click();

		await expect(page.locator('h2:has-text("Edit Endpoint")')).toBeVisible();
		await expect(page.locator('input[placeholder="my-endpoint"]')).toHaveValue('test-endpoint');

		// Change URL
		await page.fill(
			'input[placeholder="https://example.com/graphql"]',
			'https://test.com/graphql/v2'
		);
		await page.click('button:has-text("Save")');

		// Verify updated
		await expect(page.locator('text=https://test.com/graphql/v2')).toBeVisible();

		// 3. Delete Endpoint
		await newCard.hover();
		await newCard.locator('button[title="Delete Endpoint"]').click();

		await expect(page.locator('text=Are you sure?')).toBeVisible();
		await page.click('button:has-text("Confirm")');

		await expect(page.locator('text=test-endpoint')).not.toBeVisible();
	});

	test('should sort endpoints', async ({ page }) => {
		// Add two endpoints
		await page.click('text=Add Endpoint');
		await page.fill('input[placeholder="my-endpoint"]', 'A-Endpoint');
		await page.fill('input[placeholder="https://example.com/graphql"]', 'https://a.com');
		await page.click('button:has-text("Save")');

		await page.click('text=Add Endpoint');
		await page.fill('input[placeholder="my-endpoint"]', 'Z-Endpoint');
		await page.fill('input[placeholder="https://example.com/graphql"]', 'https://z.com');
		await page.click('button:has-text("Save")');

		// Default sort is A-Z
		// Shadcn Select might be used instead of raw select if we migrated it.
		// In endpoints/+page.svelte we used Shadcn Select? Let me check.

		// Select Z-A
		// If it's a native select:
		await page.selectOption('select', 'name-desc');

		// Clean up
		const aCard = page.locator('div', { hasText: 'A-Endpoint' }).filter({ hasText: 'User Defined' }).first();
		await aCard.hover();
		await aCard.locator('button[title="Delete Endpoint"]').click();
		await page.click('button:has-text("Confirm")');

		const zCard = page.locator('div', { hasText: 'Z-Endpoint' }).filter({ hasText: 'User Defined' }).first();
		await zCard.hover();
		await zCard.locator('button[title="Delete Endpoint"]').click();
		await page.click('button:has-text("Confirm")');
	});
});

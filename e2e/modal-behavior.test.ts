import { test, expect } from '@playwright/test';

test('modal behavior: close-only-via-button, nested modals stack and clean up', async ({ page }) => {
	await page.goto('/test-modal');

	// 1. Open outer modal
	await page.click('button:has-text("Open Outer Modal")');
	const outerModal = page.locator('[data-modal-identifier="outer"]');
	await expect(outerModal).toBeVisible();

	// 2. Backdrop click does NOT close the modal (product decision).
	// vaul-svelte might have an overlay. We try clicking outside.
	await page.mouse.click(10, 10);
	await expect(outerModal).toBeVisible();

	// 3. Escape does NOT close the modal (product decision).
	await page.keyboard.press('Escape');
	await expect(outerModal).toBeVisible();

	// 4. Open inner modal; both should be visible at once.
	await page.click('button:has-text("Open Inner Modal")');
	const innerModal = page.locator('[data-modal-identifier="inner"]');
	await expect(innerModal).toBeVisible();
	await expect(outerModal).toBeVisible();

	// 5. Close inner modal via its 'X' button; outer stays open.
	await innerModal.locator('button[aria-label="Close"]').click();
	await expect(innerModal).not.toBeVisible();
	await expect(outerModal).toBeVisible();

	// 6. Close outer modal via its 'X' button.
	await outerModal.locator('button[aria-label="Close"]').click();
	await expect(outerModal).not.toBeVisible();

	// 7. No modal should remain open.
	const modals = page.locator('[data-modal-identifier]');
	await expect(modals).toHaveCount(0);
});

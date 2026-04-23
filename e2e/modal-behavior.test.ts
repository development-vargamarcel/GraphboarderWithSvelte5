import { test, expect } from '@playwright/test';

test('modal behavior: closes only on button click, handles nested modals', async ({ page }) => {
	await page.goto('/test-modal');

	// 1. Open outer modal
	await page.click('button:has-text("Open Outer Modal")');
	const outerModal = page.locator('dialog[data-modal-identifier="outer"]');
	await expect(outerModal).toBeVisible();

	// 2. Try to close by clicking backdrop (should NOT close)
	await page.mouse.click(10, 10);
	await expect(outerModal).toBeVisible();

	// 3. Try to close with Escape key (should NOT close)
	await page.keyboard.press('Escape');
	await expect(outerModal).toBeVisible();

	// 4. Open inner modal
	await page.click('button:has-text("Open Inner Modal")');
	const innerModal = page.locator('dialog[data-modal-identifier="inner"]');
	await expect(innerModal).toBeVisible();
	await expect(outerModal).toBeVisible();

	// 5. Close inner modal via 'X' button
	await innerModal.locator('button[aria-label="Close"]').click();
	await expect(innerModal).not.toBeVisible();
	await expect(outerModal).toBeVisible();

	// 6. Close outer modal via 'X' button
	await outerModal.locator('button[aria-label="Close"]').click();
	await expect(outerModal).not.toBeVisible();

    // 7. Verify no backdrops are left.
    const openDialogs = page.locator('dialog[open]');
    await expect(openDialogs).toHaveCount(0);
});

import { expect, test } from '@playwright/test';
import { startMockGraphqlServer, type MockGraphqlServer } from '../src/lib/server/mockGraphqlServer';

let mockServer: MockGraphqlServer;
test.beforeAll(async () => { mockServer = await startMockGraphqlServer(); });
test.afterAll(async () => { await mockServer.close(); });

test('debug DND zone after adding filter arg', async ({ page }) => {
  await page.goto('/endpoints');
  await page.click('text=Add Endpoint');
  await page.fill('input[placeholder="my-endpoint"]', 'mock-graphql');
  await page.fill('input[placeholder="https://example.com/graphql"]', mockServer.url);
  await page.click('button[data-slot="button"]:has-text("Save")');
  await page.goto('/endpoints/mock-graphql/queries/items');

  await page.locator('[data-testid="add-column-button"]').first().click();
  await page.locator('[data-testid^="funnel-button-"]').first().click({ force: true });
  await expect(page.locator('[data-modal-identifier="activeArgumentsDataModal"]')).toBeVisible();

  await page.locator('[data-modal-identifier="activeArgumentsDataModal"] [data-testid^="funnel-button-items"]').first().click({ force: true });
  const innerDialog = page.locator('[data-modal-identifier="activeArgumentsDataModal"]').nth(1);
  await expect(innerDialog).toBeVisible();
  await innerDialog.locator('button', { hasText: 'addDefaultFields' }).click();

  // click filter
  await innerDialog.locator('button:has-text("filter")').first().click();
  await page.screenshot({ path: '/tmp/after-filter-add.png', fullPage: true });

  // Check DND zone - it's a section[role=list] inside the outer dialog
  const dndZone = page.locator('[data-slot="drawer-content"]').first().locator('section[role="list"]');
  console.log('DND zone content:', await dndZone.innerHTML().catch(() => 'not found'));

  // Also check what's inside [data-slot="drawer-content"] first's section
  const firstDialogContent = await page.locator('[data-slot="drawer-content"]').first().locator('section').innerHTML().catch(() => 'no section');
  console.log('Section in first dialog:', firstDialogContent.substring(0, 1000));

  // Look for filter arg button in DND area
  const filterArgInDnd = page.locator('section[role="list"] button');
  console.log('Buttons in DND zone:', await filterArgInDnd.count());
  if (await filterArgInDnd.count() > 0) {
    console.log('First DND button text:', await filterArgInDnd.first().textContent());
  }
  await page.screenshot({ path: '/tmp/final-state.png', fullPage: true });
});

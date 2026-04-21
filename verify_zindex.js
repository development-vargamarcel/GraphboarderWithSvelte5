import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to /endpoints/anilist/queries/Page...');
    await page.goto('http://localhost:5173/endpoints/anilist/queries/Page', { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-testid="add-column-button"]', { timeout: 10000 });
    await page.click('[data-testid="add-column-button"]');
    console.log('Opened add column dropdown.');

    const dropdown = page.locator('[data-testid="add-column-dropdown"]');
    const dropdownZ = await dropdown.evaluate(el => window.getComputedStyle(el).zIndex);
    console.log('Dropdown z-index:', dropdownZ);

    const funnelButton = page.locator('[data-testid^="funnel-button-"]').first();
    await funnelButton.waitFor({ state: 'visible' });
    await funnelButton.click();
    console.log('Clicked funnel button.');

    await page.waitForSelector('dialog.modal', { state: 'attached', timeout: 5000 });
    const modal = page.locator('dialog.modal[open]');
    const modalZ = await modal.evaluate(el => window.getComputedStyle(el).zIndex);
    console.log('Modal z-index:', modalZ);

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();

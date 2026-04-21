import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to /endpoints/anilist/queries/Page...');
    await page.goto('http://localhost:5173/endpoints/anilist/queries/Page', { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-testid="add-column-button"]', { timeout: 10000 });
    console.log('Page loaded.');

    await page.click('[data-testid="add-column-button"]');
    console.log('Clicked add column button.');

    const funnelButton = page.locator('[data-testid^="funnel-button-"]').first();
    await funnelButton.waitFor({ state: 'visible' });
    console.log('Funnel button visible.');

    // Check if funnel button is covered by something
    const isClickable = await funnelButton.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        return {
            isSame: elementAtPoint === el || el.contains(elementAtPoint),
            tag: elementAtPoint?.tagName,
            classes: elementAtPoint?.className,
            id: elementAtPoint?.id
        };
    });
    console.log('Funnel button clickable check:', isClickable);

    await funnelButton.click();
    console.log('Clicked funnel button.');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'after_funnel_click.png' });

  } catch (error) {
    console.error('Error during verification:', error);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();

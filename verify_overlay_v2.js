import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to /endpoints/anilist/queries/Page...');
    await page.goto('http://localhost:5173/endpoints/anilist/queries/Page', { waitUntil: 'networkidle' });

    await page.waitForSelector('[data-testid="add-column-button"]', { timeout: 10000 });
    await page.click('[data-testid="add-column-button"]');

    const funnelButton = page.locator('[data-testid^="funnel-button-"]').first();
    await funnelButton.waitFor({ state: 'visible' });
    await funnelButton.click();
    console.log('Clicked funnel button.');

    await page.waitForSelector('dialog.modal', { state: 'attached', timeout: 5000 });
    await page.waitForTimeout(2000);

    const analysis = await page.evaluate(() => {
        const modal = document.querySelector('dialog.modal[open]');
        if (!modal) return { error: 'Open modal not found' };

        // We want to find the buttons that represent arguments, like "page" or "0"
        const allButtons = Array.from(modal.querySelectorAll('button'));

        return allButtons.map(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elementAtPoint = document.elementFromPoint(centerX, centerY);

            const styles = [];
            let curr = btn;
            while (curr && curr !== modal) {
                const s = window.getComputedStyle(curr);
                styles.push({
                    tag: curr.tagName,
                    classes: curr.className,
                    pointerEvents: s.pointerEvents,
                });
                curr = curr.parentElement;
            }

            return {
                text: btn.innerText.trim().substring(0, 30),
                isClickable: elementAtPoint === btn || btn.contains(elementAtPoint),
                blockedBy: {
                    tag: elementAtPoint?.tagName,
                    classes: elementAtPoint?.className,
                    pointerEvents: elementAtPoint ? window.getComputedStyle(elementAtPoint).pointerEvents : null
                },
                styles
            };
        }).filter(Boolean);
    });

    console.log('Analysis result:', JSON.stringify(analysis, null, 2));

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();

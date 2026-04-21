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

    // Force click via JS
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('dialog.modal button')).find(b => b.innerText.trim() === '0');
        if (btn) btn.click();
    });
    console.log('JS Clicked "0" button.');

    await page.waitForTimeout(1000);

    const analysis = await page.evaluate(() => {
        const modal = document.querySelector('dialog.modal[open]');
        if (!modal) return { error: 'Open modal not found' };

        const inputs = modal.querySelectorAll('input');

        return Array.from(inputs).map(input => {
            const rect = input.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elementAtPoint = document.elementFromPoint(centerX, centerY);

            const styles = [];
            let curr = input;
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
                tag: input.tagName,
                type: input.type,
                placeholder: input.placeholder,
                value: input.value,
                isClickable: elementAtPoint === input || input.contains(elementAtPoint),
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

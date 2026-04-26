import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        try:
            print("Navigating to home page...")
            await page.goto("http://localhost:5173", wait_until="networkidle")
            await page.screenshot(path="verification/screenshots/home_v3.png")

            print("Looking for 'Local Endpoints' section...")
            # Click on the first local endpoint
            await page.click("text=Pokemons")
            await page.wait_for_load_state("networkidle")

            print("On endpoint page. Taking screenshot...")
            await page.screenshot(path="verification/screenshots/endpoint_detail_v3.png", full_page=True)

            # Try to find the sidebar
            sidebar = page.locator("[data-sidebar='sidebar']")
            if await sidebar.is_visible():
                print("Sidebar is visible.")
            else:
                print("Sidebar is NOT visible. Attempting to click trigger...")
                # The trigger is a button with -ml-1 class usually in our header
                await page.click("header button.shrink-0")
                await asyncio.sleep(1)
                if await sidebar.is_visible():
                    print("Sidebar is now visible after click.")
                else:
                    print("Sidebar still not visible.")

            await page.screenshot(path="verification/screenshots/sidebar_expanded_v3.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            await page.screenshot(path="verification/screenshots/error_v3.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification/screenshots"):
        os.makedirs("verification/screenshots")
    asyncio.run(run())

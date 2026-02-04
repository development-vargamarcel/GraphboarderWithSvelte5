from playwright.sync_api import sync_playwright, expect
import os

def test_command_palette():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Go to home
            page.goto("http://localhost:5173/")
            page.wait_for_load_state("networkidle")

            # Press Ctrl+K
            page.keyboard.press("Control+k")
            page.wait_for_timeout(500)

            # Check if open
            dialog = page.locator("dialog.modal")
            if not dialog.is_visible():
                print("Dialog not visible after Control+k. Trying Meta+k")
                page.keyboard.press("Meta+k")
                page.wait_for_timeout(500)

            expect(dialog).to_be_visible()

            # Type "End"
            page.keyboard.type("End")

            # Expect "Endpoints" to be visible
            expect(page.get_by_text("Endpoints")).to_be_visible()

            # Take screenshot
            os.makedirs("/home/jules/verification", exist_ok=True)
            page.screenshot(path="/home/jules/verification/verification.png")

        except Exception as e:
            print(f"Error: {e}")
            os.makedirs("/home/jules/verification", exist_ok=True)
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    test_command_palette()

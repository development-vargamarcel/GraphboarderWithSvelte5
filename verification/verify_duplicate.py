from playwright.sync_api import Page, expect, sync_playwright
import os

def test_duplicate_endpoint(page: Page):
    # Navigate to endpoints page
    page.goto("http://localhost:5173/endpoints")

    # Wait for endpoints to load
    page.wait_for_selector(".card")

    # Find the first endpoint card and hover over it
    card = page.locator(".card").first
    card.hover()

    # Click the Duplicate button
    duplicate_btn = card.get_by_title("Duplicate Endpoint")
    duplicate_btn.click()

    # Verify Modal opens (specifically the one with "Duplicate Endpoint")
    # We look for a visible modal with the heading
    modal = page.locator(".modal-box").filter(has=page.get_by_role("heading", name="Duplicate Endpoint"))
    expect(modal).to_be_visible()

    # Verify ID input contains "_copy"
    id_input = modal.locator("#endpoint-id")
    # Get value
    value = id_input.input_value()
    print(f"ID Input Value: {value}")
    assert "_copy" in value

    # Take screenshot of the modal
    page.screenshot(path="verification/duplicate_modal.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_duplicate_endpoint(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

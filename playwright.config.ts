import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run preview',
		port: 4173,
		reuseExistingServer: true,
        timeout: 120000
	},
	testDir: 'e2e'
});

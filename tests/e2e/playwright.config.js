const {
    defineConfig,
    devices
} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './specs',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5174',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [{
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome']
            },
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox']
            },
        },
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari']
            },
        },
    ],

    webServer: [{
            command: 'npm run dev',
            cwd: '../backend',
            port: 3001,
            reuseExistingServer: !process.env.CI,
            env: {
                NODE_ENV: 'test',
                PORT: '3001'
            }
        },
        {
            command: 'npm run dev',
            cwd: '../frontend',
            port: 5174,
            reuseExistingServer: !process.env.CI,
            env: {
                VITE_API_BASE_URL: 'http://localhost:3001'
            }
        }
    ],
});
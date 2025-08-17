const {
    spawn
} = require('child_process');
const axios = require('axios');

// テスト環境の設定
const TEST_CONFIG = {
    BACKEND_PORT: 3001,
    FRONTEND_PORT: 5174,
    BACKEND_URL: 'http://localhost:3001',
    FRONTEND_URL: 'http://localhost:5174',
    TIMEOUT: 30000
};

class TestEnvironment {
    constructor() {
        this.backendProcess = null;
        this.frontendProcess = null;
    }

    async startBackend() {
        console.log('バックエンドサーバーを起動中...');

        return new Promise((resolve, reject) => {
            this.backendProcess = spawn('npm', ['run', 'dev'], {
                cwd: './backend',
                env: {
                    ...process.env,
                    PORT: TEST_CONFIG.BACKEND_PORT,
                    NODE_ENV: 'test'
                },
                stdio: 'pipe'
            });

            this.backendProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`Backend: ${output}`);
                if (output.includes('Server running on port')) {
                    resolve();
                }
            });

            this.backendProcess.stderr.on('data', (data) => {
                console.error(`Backend Error: ${data}`);
            });

            this.backendProcess.on('error', reject);

            // タイムアウト設定
            setTimeout(() => {
                reject(new Error('バックエンドの起動がタイムアウトしました'));
            }, TEST_CONFIG.TIMEOUT);
        });
    }

    async startFrontend() {
        console.log('フロントエンドサーバーを起動中...');

        return new Promise((resolve, reject) => {
            this.frontendProcess = spawn('npm', ['run', 'dev'], {
                cwd: './frontend',
                env: {
                    ...process.env,
                    PORT: TEST_CONFIG.FRONTEND_PORT,
                    VITE_API_BASE_URL: TEST_CONFIG.BACKEND_URL
                },
                stdio: 'pipe'
            });

            this.frontendProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`Frontend: ${output}`);
                if (output.includes('Local:') || output.includes('ready in')) {
                    resolve();
                }
            });

            this.frontendProcess.stderr.on('data', (data) => {
                console.error(`Frontend Error: ${data}`);
            });

            this.frontendProcess.on('error', reject);

            // タイムアウト設定
            setTimeout(() => {
                reject(new Error('フロントエンドの起動がタイムアウトしました'));
            }, TEST_CONFIG.TIMEOUT);
        });
    }

    async waitForServices() {
        console.log('サービスの起動を待機中...');

        // バックエンドの起動を確認
        await this.waitForService(TEST_CONFIG.BACKEND_URL + '/health', 'バックエンド');

        // フロントエンドの起動を確認
        await this.waitForService(TEST_CONFIG.FRONTEND_URL, 'フロントエンド');
    }

    async waitForService(url, serviceName) {
        const maxRetries = 30;
        const retryInterval = 1000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                await axios.get(url, {
                    timeout: 5000
                });
                console.log(`${serviceName}が起動しました: ${url}`);
                return;
            } catch (error) {
                console.log(`${serviceName}の起動を待機中... (${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }

        throw new Error(`${serviceName}の起動に失敗しました: ${url}`);
    }

    async setup() {
        try {
            // 並行してサーバーを起動
            await Promise.all([
                this.startBackend(),
                this.startFrontend()
            ]);

            // サービスの起動を確認
            await this.waitForServices();

            console.log('テスト環境のセットアップが完了しました');
        } catch (error) {
            console.error('テスト環境のセットアップに失敗しました:', error);
            await this.cleanup();
            throw error;
        }
    }

    async cleanup() {
        console.log('テスト環境をクリーンアップ中...');

        if (this.backendProcess) {
            this.backendProcess.kill('SIGTERM');
            this.backendProcess = null;
        }

        if (this.frontendProcess) {
            this.frontendProcess.kill('SIGTERM');
            this.frontendProcess = null;
        }

        console.log('テスト環境のクリーンアップが完了しました');
    }
}

module.exports = {
    TestEnvironment,
    TEST_CONFIG
};
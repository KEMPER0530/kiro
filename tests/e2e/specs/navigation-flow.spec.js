const {
    test,
    expect
} = require('@playwright/test');

test.describe('ナビゲーションフロー', () => {
    test.beforeEach(async ({
        page
    }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('メインナビゲーションが正常に動作する', async ({
        page
    }) => {
        // 1. 初期状態でSearchページが表示されることを確認
        await expect(page).toHaveURL(/.*search/);

        // 2. Categoriesページに移動
        await page.click('text=Categories');
        await expect(page).toHaveURL(/.*categories/);
        await expect(page.locator('h1:has-text("Categories")')).toBeVisible();

        // 3. Favoritesページに移動
        await page.click('text=Favorites');
        await expect(page).toHaveURL(/.*favorites/);
        await expect(page.locator('h1:has-text("Favorites")')).toBeVisible();

        // 4. Statisticsページに移動
        await page.click('text=Statistics');
        await expect(page).toHaveURL(/.*statistics/);
        await expect(page.locator('h1:has-text("Statistics")')).toBeVisible();

        // 5. Searchページに戻る
        await page.click('text=Search');
        await expect(page).toHaveURL(/.*search/);
        await expect(page.locator('input[placeholder*="search"]')).toBeVisible();
    });

    test('アクティブなナビゲーション項目がハイライトされる', async ({
        page
    }) => {
        // Searchページでアクティブ状態を確認
        const searchNavItem = page.locator('nav button:has-text("Search")');
        await expect(searchNavItem).toHaveClass(/bg-blue-100/);

        // Categoriesページに移動してアクティブ状態を確認
        await page.click('text=Categories');
        const categoriesNavItem = page.locator('nav button:has-text("Categories")');
        await expect(categoriesNavItem).toHaveClass(/bg-blue-100/);

        // 前のアクティブ項目がハイライト解除されることを確認
        await expect(searchNavItem).not.toHaveClass(/bg-blue-100/);
    });

    test('レスポンシブナビゲーションが正常に動作する', async ({
        page
    }) => {
        // モバイルビューポートに変更
        await page.setViewportSize({
            width: 375,
            height: 667
        });

        // モバイルメニューボタンが表示されることを確認
        const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
        await expect(mobileMenuButton).toBeVisible();

        // モバイルメニューを開く
        await mobileMenuButton.click();

        // モバイルメニューが表示されることを確認
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        await expect(mobileMenu).toBeVisible();

        // モバイルメニューからナビゲーション
        await page.click('text=Categories');
        await expect(page).toHaveURL(/.*categories/);

        // メニューが自動的に閉じることを確認
        await expect(mobileMenu).not.toBeVisible();
    });

    test('ブラウザの戻る/進むボタンが正常に動作する', async ({
        page
    }) => {
        // ページ間を移動
        await page.click('text=Categories');
        await page.click('text=Favorites');
        await page.click('text=Statistics');

        // 戻るボタンでナビゲーション
        await page.goBack();
        await expect(page).toHaveURL(/.*favorites/);

        await page.goBack();
        await expect(page).toHaveURL(/.*categories/);

        await page.goBack();
        await expect(page).toHaveURL(/.*search/);

        // 進むボタンでナビゲーション
        await page.goForward();
        await expect(page).toHaveURL(/.*categories/);
    });

    test('直接URLアクセスが正常に動作する', async ({
        page
    }) => {
        // 各ページに直接アクセス
        await page.goto('/categories');
        await expect(page.locator('h1:has-text("Categories")')).toBeVisible();

        await page.goto('/favorites');
        await expect(page.locator('h1:has-text("Favorites")')).toBeVisible();

        await page.goto('/statistics');
        await expect(page.locator('h1:has-text("Statistics")')).toBeVisible();

        // 存在しないページにアクセス
        await page.goto('/nonexistent');
        await expect(page.locator('text=404')).toBeVisible();
    });

    test('ページ読み込み中のローディング状態が表示される', async ({
        page
    }) => {
        // ネットワークを遅延させてローディング状態をテスト
        await page.route('**/api/**', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            route.continue();
        });

        await page.click('text=Statistics');

        // ローディングスピナーが表示されることを確認
        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

        // ローディングが完了することを確認
        await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible({
            timeout: 5000
        });
    });
});
const {
    test,
    expect
} = require('@playwright/test');

test.describe('動画検索フロー', () => {
    test.beforeEach(async ({
        page
    }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('基本的な動画検索フローが正常に動作する', async ({
        page
    }) => {
        // 1. 検索ページに移動
        await page.click('text=Search');
        await expect(page).toHaveURL(/.*search/);

        // 2. 検索フォームが表示されることを確認
        const searchInput = page.locator('input[placeholder*="search"]');
        const searchButton = page.locator('button:has-text("Search")');
        const categorySelect = page.locator('select');

        await expect(searchInput).toBeVisible();
        await expect(searchButton).toBeVisible();
        await expect(categorySelect).toBeVisible();

        // 3. 検索クエリを入力
        await searchInput.fill('eFootball');

        // 4. 検索を実行
        await searchButton.click();

        // 5. ローディング状態を確認
        await expect(page.locator('text=Loading')).toBeVisible();

        // 6. 検索結果が表示されることを確認
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });
        const videoCards = page.locator('[data-testid="video-card"]');
        await expect(videoCards.first()).toBeVisible();

        // 7. 動画カードの基本要素を確認
        const firstVideoCard = videoCards.first();
        await expect(firstVideoCard.locator('img')).toBeVisible(); // サムネイル
        await expect(firstVideoCard.locator('text=eFootball')).toBeVisible(); // タイトル
        await expect(firstVideoCard.locator('[data-testid="favorite-button"]')).toBeVisible(); // お気に入りボタン
    });

    test('カテゴリフィルター付き検索が正常に動作する', async ({
        page
    }) => {
        await page.click('text=Search');

        // カテゴリを選択
        await page.selectOption('select', 'gameplay');

        // 検索クエリを入力
        await page.fill('input[placeholder*="search"]', 'eFootball');

        // 検索を実行
        await page.click('button:has-text("Search")');

        // 結果を待機
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });

        // カテゴリバッジが表示されることを確認
        const categoryBadges = page.locator('text=Gameplay');
        await expect(categoryBadges.first()).toBeVisible();
    });

    test('検索結果が空の場合の表示が正常に動作する', async ({
        page
    }) => {
        await page.click('text=Search');

        // 存在しないであろう検索クエリを入力
        await page.fill('input[placeholder*="search"]', 'nonexistentquerythatshouldhavenoResults123456');

        // 検索を実行
        await page.click('button:has-text("Search")');

        // 空の結果メッセージを確認
        await expect(page.locator('text=No videos found')).toBeVisible({
            timeout: 10000
        });
    });

    test('検索エラー時のエラーハンドリングが正常に動作する', async ({
        page
    }) => {
        // ネットワークエラーをシミュレート
        await page.route('**/api/videos/search*', route => {
            route.abort('failed');
        });

        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');

        // エラーメッセージが表示されることを確認
        await expect(page.locator('[role="alert"]')).toBeVisible({
            timeout: 5000
        });
    });
});
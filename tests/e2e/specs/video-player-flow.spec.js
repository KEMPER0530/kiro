const {
    test,
    expect
} = require('@playwright/test');

test.describe('動画プレイヤーフロー', () => {
    test.beforeEach(async ({
        page
    }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('動画選択から再生までのフローが正常に動作する', async ({
        page
    }) => {
        // 1. 検索ページに移動
        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');

        // 2. 検索結果を待機
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });

        // 3. 最初の動画をクリック
        const firstVideoCard = page.locator('[data-testid="video-card"]').first();
        await firstVideoCard.click();

        // 4. 動画プレイヤーページに移動することを確認
        await expect(page).toHaveURL(/.*video/);

        // 5. YouTube埋め込みプレイヤーが表示されることを確認
        const youtubeIframe = page.locator('iframe[src*="youtube.com"]');
        await expect(youtubeIframe).toBeVisible({
            timeout: 10000
        });

        // 6. 動画情報が表示されることを確認
        await expect(page.locator('h1')).toBeVisible(); // 動画タイトル
        await expect(page.locator('text=Channel:')).toBeVisible(); // チャンネル情報
        await expect(page.locator('[data-testid="favorite-button"]')).toBeVisible(); // お気に入りボタン
    });

    test('関連動画が表示される', async ({
        page
    }) => {
        // 動画プレイヤーページに直接移動（テスト用の動画ID）
        await page.goto('/video/dQw4w9WgXcQ'); // Rick Roll動画（テスト用）

        // 関連動画セクションが表示されることを確認
        await expect(page.locator('text=Related Videos')).toBeVisible({
            timeout: 10000
        });

        // 関連動画カードが表示されることを確認
        const relatedVideoCards = page.locator('[data-testid="related-video-card"]');
        await expect(relatedVideoCards.first()).toBeVisible({
            timeout: 10000
        });
    });

    test('動画プレイヤーのエラーハンドリングが正常に動作する', async ({
        page
    }) => {
        // 存在しない動画IDでページに移動
        await page.goto('/video/nonexistent-video-id');

        // エラーメッセージが表示されることを確認
        await expect(page.locator('[role="alert"]')).toBeVisible({
            timeout: 10000
        });
        await expect(page.locator('text=Video not found')).toBeVisible();
    });

    test('動画プレイヤーからの戻るナビゲーションが正常に動作する', async ({
        page
    }) => {
        // 検索から動画プレイヤーに移動
        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });
        await page.locator('[data-testid="video-card"]').first().click();

        // 戻るボタンをクリック
        await page.goBack();

        // 検索結果ページに戻ることを確認
        await expect(page).toHaveURL(/.*search/);
        await expect(page.locator('[data-testid="video-card"]')).toBeVisible();
    });
});
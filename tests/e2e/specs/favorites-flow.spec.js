const {
    test,
    expect
} = require('@playwright/test');

test.describe('お気に入り機能フロー', () => {
    // テスト用のユーザーIDを設定
    const testUserId = 'e2e-test-user';

    test.beforeEach(async ({
        page
    }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // テスト前にお気に入りをクリア（APIを直接呼び出し）
        await page.evaluate(async (userId) => {
            try {
                await fetch(`http://localhost:3001/api/favorites?userId=${userId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                // エラーは無視（お気に入りが存在しない場合）
            }
        }, testUserId);
    });

    test('動画をお気に入りに追加→確認→削除のフローが正常に動作する', async ({
        page
    }) => {
        // 1. 検索ページで動画を検索
        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });

        // 2. 最初の動画のお気に入りボタンをクリック
        const firstVideoCard = page.locator('[data-testid="video-card"]').first();
        const favoriteButton = firstVideoCard.locator('[data-testid="favorite-button"]');

        // お気に入りボタンが未選択状態であることを確認
        await expect(favoriteButton).toHaveClass(/text-gray-400/);

        // お気に入りに追加
        await favoriteButton.click();

        // お気に入りボタンが選択状態になることを確認
        await expect(favoriteButton).toHaveClass(/text-red-500/);

        // 3. お気に入りページに移動
        await page.click('text=Favorites');
        await expect(page).toHaveURL(/.*favorites/);

        // 4. お気に入りに追加した動画が表示されることを確認
        await page.waitForSelector('[data-testid="favorite-video-card"]', {
            timeout: 10000
        });
        const favoriteVideoCards = page.locator('[data-testid="favorite-video-card"]');
        await expect(favoriteVideoCards).toHaveCount(1);

        // 5. お気に入りから削除
        const removeButton = favoriteVideoCards.first().locator('[data-testid="remove-favorite-button"]');
        await removeButton.click();

        // 6. 削除確認ダイアログが表示される場合は確認
        const confirmButton = page.locator('button:has-text("Remove")');
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        // 7. お気に入りが空になることを確認
        await expect(page.locator('text=No favorite videos')).toBeVisible();
    });

    test('お気に入りページから動画再生ができる', async ({
        page
    }) => {
        // 事前にお気に入りを追加（APIを直接呼び出し）
        await page.evaluate(async (userId) => {
            const testVideo = {
                id: 'dQw4w9WgXcQ',
                title: 'Test Video',
                description: 'Test description',
                thumbnail: {
                    default: 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg',
                    medium: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                    high: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
                },
                channelTitle: 'Test Channel',
                publishedAt: '2023-01-01T00:00:00.000Z',
                duration: 'PT3M33S',
                viewCount: 1000000,
                category: 'gameplay'
            };

            await fetch('http://localhost:3001/api/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    video: testVideo
                })
            });
        }, testUserId);

        // お気に入りページに移動
        await page.click('text=Favorites');
        await page.waitForSelector('[data-testid="favorite-video-card"]', {
            timeout: 10000
        });

        // お気に入り動画をクリック
        await page.locator('[data-testid="favorite-video-card"]').first().click();

        // 動画プレイヤーページに移動することを確認
        await expect(page).toHaveURL(/.*video/);
        await expect(page.locator('iframe[src*="youtube.com"]')).toBeVisible({
            timeout: 10000
        });
    });

    test('お気に入りの上限（100個）に達した場合のエラーハンドリング', async ({
        page
    }) => {
        // この テストは実際に100個のお気に入りを作成するのは時間がかかるため、
        // APIレスポンスをモックして上限エラーをシミュレート
        await page.route('**/api/favorites', route => {
            if (route.request().method() === 'POST') {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Limit Exceeded',
                        message: 'Maximum number of favorites (100) reached'
                    })
                });
            } else {
                route.continue();
            }
        });

        // 検索ページで動画を検索
        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });

        // お気に入りボタンをクリック
        const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
        await favoriteButton.click();

        // エラーメッセージが表示されることを確認
        await expect(page.locator('[role="alert"]')).toBeVisible();
        await expect(page.locator('text=Maximum number of favorites')).toBeVisible();
    });

    test('お気に入り状態が複数ページ間で同期される', async ({
        page
    }) => {
        // 1. 検索ページで動画をお気に入りに追加
        await page.click('text=Search');
        await page.fill('input[placeholder*="search"]', 'eFootball');
        await page.click('button:has-text("Search")');
        await page.waitForSelector('[data-testid="video-card"]', {
            timeout: 10000
        });

        const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
        await favoriteButton.click();
        await expect(favoriteButton).toHaveClass(/text-red-500/);

        // 2. 動画プレイヤーページに移動
        await page.locator('[data-testid="video-card"]').first().click();
        await expect(page).toHaveURL(/.*video/);

        // 3. 動画プレイヤーページでもお気に入り状態が反映されていることを確認
        const playerFavoriteButton = page.locator('[data-testid="favorite-button"]');
        await expect(playerFavoriteButton).toHaveClass(/text-red-500/);

        // 4. 動画プレイヤーページでお気に入りを解除
        await playerFavoriteButton.click();
        await expect(playerFavoriteButton).toHaveClass(/text-gray-400/);

        // 5. 検索ページに戻る
        await page.goBack();

        // 6. 検索ページでもお気に入り状態が解除されていることを確認
        const searchFavoriteButton = page.locator('[data-testid="favorite-button"]').first();
        await expect(searchFavoriteButton).toHaveClass(/text-gray-400/);
    });
});
# テストガイド

このガイドでは、YouTube eFootball Player アプリケーションのテスト戦略、ツール、手順について包括的な情報を提供します。

## 🧪 テスト戦略

### テストピラミッド

```text
    /\
   /  \     E2Eテスト（少数）
  /____\    - ユーザージャーニーテスト
 /      \   - クリティカルパス検証
/________\  統合テスト（中程度）
           - API統合
           - データベース操作
           - サービス間相互作用
___________
           ユニットテスト（多数）
           - コンポーネントロジック
           - ユーティリティ関数
           - ビジネスロジック
```

### テストタイプ

1. **ユニットテスト**: 個別のコンポーネントと関数を分離してテスト
2. **統合テスト**: システムの異なる部分間の相互作用をテスト
3. **エンドツーエンドテスト**: 完全なユーザーワークフローをテスト
4. **パフォーマンステスト**: 負荷下でのシステムパフォーマンスをテスト
5. **セキュリティテスト**: セキュリティ脆弱性をテスト

## 🏗️ テスト環境セットアップ

### 前提条件

- Node.js 18+ と npm
- Docker と Docker Compose
- Chrome/Chromium ブラウザ（E2E テスト用）

### セットアップコマンド

```bash
# 全依存関係をインストール
npm install

# フロントエンドテスト依存関係をインストール
cd frontend && npm install

# バックエンドテスト依存関係をインストール
cd backend && npm install

# テストスイート依存関係をインストール
cd tests && npm install

# テスト環境を起動
docker-compose -f docker-compose.test.yml up -d
```

## 🔧 ユニットテスト

### フロントエンドユニットテスト

#### 技術スタック

- **Jest**: テストランナーとアサーションライブラリ
- **React Testing Library**: React コンポーネントテストユーティリティ
- **@testing-library/user-event**: ユーザーインタラクションシミュレーション
- **MSW (Mock Service Worker)**: API モッキング

#### フロントエンドテスト実行

```bash
cd frontend

# 全テストを実行
npm test

# ウォッチモードでテストを実行
npm test -- --watch

# カバレッジ付きでテストを実行
npm test -- --coverage

# 特定のテストファイルを実行
npm test SearchComponent.test.tsx

# パターンにマッチするテストを実行
npm test -- --testNamePattern="should render"
```

#### コンポーネントテスト例

```typescript
// src/components/__tests__/SearchComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchComponent } from '../SearchComponent';

describe('SearchComponent', () => {
  const mockOnSearch = jest.fn();
  const defaultProps = {
    onSearch: mockOnSearch,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('検索入力とボタンをレンダリングすべき', () => {
    render(<SearchComponent {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('eFootball動画を検索...')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /検索/i })).toBeInTheDocument();
  });

  it('フォーム送信時にonSearchを呼び出すべき', async () => {
    const user = userEvent.setup();
    render(<SearchComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('eFootball動画を検索...');
    const button = screen.getByRole('button', { name: /検索/i });

    await user.type(input, 'eFootball 2024');
    await user.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('eFootball 2024', undefined);
  });

  it('loadingがtrueの時にローディング状態を表示すべき', () => {
    render(<SearchComponent {...defaultProps} loading={true} />);

    expect(screen.getByRole('button', { name: /検索中/i })).toBeDisabled();
  });

  it('カテゴリが選択された時にカテゴリでフィルターすべき', async () => {
    const user = userEvent.setup();
    render(<SearchComponent {...defaultProps} />);

    const categorySelect = screen.getByLabelText('カテゴリ');
    await user.selectOptions(categorySelect, 'gameplay');

    const input = screen.getByPlaceholderText('eFootball動画を検索...');
    const button = screen.getByRole('button', { name: /検索/i });

    await user.type(input, 'テストクエリ');
    await user.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('テストクエリ', 'gameplay');
  });
});
```

#### フックテスト例

```typescript
// src/hooks/__tests__/useVideoSearch.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoSearch } from '../useVideoSearch';
import * as api from '../../utils/api';

jest.mock('../../utils/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useVideoSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態を返すべき', () => {
    const { result } = renderHook(() => useVideoSearch());

    expect(result.current.videos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('動画検索を正常に実行すべき', async () => {
    const mockVideos = [
      { id: '1', title: 'テスト動画 1' },
      { id: '2', title: 'テスト動画 2' },
    ];

    mockedApi.searchVideos.mockResolvedValue({
      videos: mockVideos,
      totalResults: 2,
    });

    const { result } = renderHook(() => useVideoSearch());

    result.current.searchVideos('テストクエリ');

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.videos).toEqual(mockVideos);
      expect(result.current.error).toBeNull();
    });
  });

  it('検索エラーを処理すべき', async () => {
    const errorMessage = '検索に失敗しました';
    mockedApi.searchVideos.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVideoSearch());

    result.current.searchVideos('テストクエリ');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.videos).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });
  });
});
```

### バックエンドユニットテスト

#### 技術スタック

- **Jest**: テストランナーとアサーションライブラリ
- **Supertest**: HTTP アサーションテスト
- **Sinon**: モッキングとスタブ
- **Nock**: HTTP リクエストモッキング

#### バックエンドテスト実行

```bash
cd backend

# 全テストを実行
npm test

# ウォッチモードでテストを実行
npm test -- --watch

# カバレッジ付きでテストを実行
npm test -- --coverage

# 特定のテストファイルを実行
npm test routes/youtube.test.js

# パターンにマッチするテストを実行
npm test -- --testNamePattern="should return search results"
```

#### API ルートテスト例

```javascript
// src/routes/__tests__/youtube.test.js
const request = require('supertest');
const app = require('../../index');
const YouTubeService = require('../../services/youtubeService');
const redisClient = require('../../config/redis');

jest.mock('../../services/youtubeService');
jest.mock('../../config/redis');

describe('YouTube Routes', () => {
  let mockYouTubeService;
  let mockRedisClient;

  beforeEach(() => {
    mockYouTubeService = new YouTubeService();
    mockRedisClient = redisClient;
    jest.clearAllMocks();
  });

  describe('GET /api/videos/search', () => {
    it('検索結果を返すべき', async () => {
      const mockVideos = [
        {
          id: 'test-video-1',
          title: 'eFootball テスト動画',
          description: 'テスト説明',
          thumbnail: { default: 'http://example.com/thumb.jpg' },
          channelTitle: 'テストチャンネル',
          publishedAt: '2024-01-15T10:30:00Z',
          duration: 'PT10M30S',
          viewCount: 1000,
          category: 'gameplay',
        },
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockYouTubeService.searchVideos.mockResolvedValue({
        videos: mockVideos,
        totalResults: 1,
      });

      const response = await request(app)
        .get('/api/videos/search')
        .query({ q: 'eFootball', maxResults: 10 })
        .expect(200);

      expect(response.body.videos).toHaveLength(1);
      expect(response.body.videos[0]).toMatchObject({
        id: 'test-video-1',
        title: 'eFootball テスト動画',
      });
      expect(response.body.cached).toBe(false);
    });

    it('利用可能な場合はキャッシュされた結果を返すべき', async () => {
      const cachedResult = {
        videos: [{ id: 'cached-video' }],
        totalResults: 1,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      const response = await request(app)
        .get('/api/videos/search')
        .query({ q: 'eFootball' })
        .expect(200);

      expect(response.body.cached).toBe(true);
      expect(response.body.videos).toEqual(cachedResult.videos);
      expect(mockYouTubeService.searchVideos).not.toHaveBeenCalled();
    });

    it('クエリパラメータを検証すべき', async () => {
      const response = await request(app)
        .get('/api/videos/search')
        .query({ maxResults: 100 }) // 最大値を超過
        .expect(400);

      expect(response.body.error).toBe('バリデーションエラー');
    });

    it('YouTube APIエラーを処理すべき', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockYouTubeService.searchVideos.mockRejectedValue(
        new Error('YouTube APIクォータを超過しました')
      );

      const response = await request(app)
        .get('/api/videos/search')
        .query({ q: 'eFootball' })
        .expect(502);

      expect(response.body.error).toBe('YouTube APIエラー');
    });
  });
});
```

#### サービステスト例

```javascript
// src/services/__tests__/youtubeService.test.js
const YouTubeService = require('../youtubeService');
const axios = require('axios');

jest.mock('axios');
const mockedAxios = axios;

describe('YouTubeService', () => {
  let youtubeService;

  beforeEach(() => {
    youtubeService = new YouTubeService();
    jest.clearAllMocks();
  });

  describe('searchVideos', () => {
    it('動画を検索してカテゴライズすべき', async () => {
      const mockApiResponse = {
        data: {
          items: [
            {
              id: { videoId: 'test-video-1' },
              snippet: {
                title: 'eFootball ゲームプレイチュートリアル',
                description: 'eFootballの遊び方を学ぼう',
                thumbnails: {
                  default: { url: 'http://example.com/thumb.jpg' },
                },
                channelTitle: 'ゲーミングチャンネル',
                publishedAt: '2024-01-15T10:30:00Z',
              },
            },
          ],
          pageInfo: { totalResults: 1 },
        },
      };

      mockedAxios.get.mockResolvedValue(mockApiResponse);

      const result = await youtubeService.searchVideos(
        'eFootball チュートリアル',
        'tips',
        10
      );

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]).toMatchObject({
        id: 'test-video-1',
        title: 'eFootball ゲームプレイチュートリアル',
        category: 'tips',
      });
      expect(result.totalResults).toBe(1);
    });

    it('APIエラーを適切に処理すべき', async () => {
      mockedAxios.get.mockRejectedValue(new Error('APIエラー'));

      await expect(
        youtubeService.searchVideos('eFootball', 'gameplay', 10)
      ).rejects.toThrow('APIエラー');
    });
  });
});
```

## 🔗 統合テスト

### API 統合テスト

統合テストは、システムの異なる部分が正しく連携することを確認します。

#### 統合テスト実行

```bash
cd tests

# テスト環境を起動
docker-compose -f docker-compose.test.yml up -d

# 統合テストを実行
npm run test:integration

# 特定の統合テストを実行
npm run test:integration -- --grep "favorites API"
```

#### 統合テスト例

```javascript
// tests/integration/api.integration.test.js
const request = require('supertest');
const { setupTestEnvironment, teardownTestEnvironment } = require('./setup');

describe('API統合テスト', () => {
  let app;
  let testUserId;

  beforeAll(async () => {
    app = await setupTestEnvironment();
    testUserId = 'integration-test-user';
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('動画検索とお気に入りフロー', () => {
    let searchResults;
    let testVideo;

    it('動画を検索すべき', async () => {
      const response = await request(app)
        .get('/api/videos/search')
        .query({ q: 'eFootball', maxResults: 5 })
        .expect(200);

      expect(response.body.videos).toBeDefined();
      expect(response.body.videos.length).toBeGreaterThan(0);

      searchResults = response.body.videos;
      testVideo = searchResults[0];
    });

    it('動画をお気に入りに追加すべき', async () => {
      const response = await request(app)
        .post('/api/favorites')
        .send({
          userId: testUserId,
          video: testVideo,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.favorite.videoId).toBe(testVideo.id);
    });

    it('ユーザーお気に入りを取得すべき', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.favorites).toHaveLength(1);
      expect(response.body.favorites[0].videoId).toBe(testVideo.id);
    });

    it('お気に入りから動画を削除すべき', async () => {
      await request(app)
        .delete(`/api/favorites/${testVideo.id}`)
        .query({ userId: testUserId })
        .expect(200);

      const response = await request(app)
        .get('/api/favorites')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.favorites).toHaveLength(0);
    });
  });

  describe('検索履歴フロー', () => {
    it('検索履歴を記録すべき', async () => {
      await request(app)
        .post('/api/search-history')
        .send({
          userId: testUserId,
          query: 'eFootball 2024',
          category: 'gameplay',
          resultCount: 25,
        })
        .expect(201);
    });

    it('検索履歴を取得すべき', async () => {
      const response = await request(app)
        .get('/api/search-history')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.history).toHaveLength(1);
      expect(response.body.history[0].query).toBe('eFootball 2024');
    });

    it('検索統計を提供すべき', async () => {
      const response = await request(app)
        .get('/api/search-history')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalSearches).toBeGreaterThan(0);
    });
  });
});
```

## 🎭 エンドツーエンドテスト

### E2E テストスタック

- **Playwright**: モダン E2E テストフレームワーク
- **Docker**: コンテナ化されたテスト環境

### E2E テスト実行

```bash
cd tests

# Playwrightブラウザをインストール
npx playwright install

# 全E2Eテストを実行
npm run test:e2e

# ヘッドモードでテストを実行（ブラウザ表示）
npm run test:e2e -- --headed

# 特定のテストファイルを実行
npm run test:e2e -- search-flow.spec.js

# デバッグモードでテストを実行
npm run test:e2e -- --debug
```

### E2E テスト例

```javascript
// tests/e2e/specs/search-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('動画検索フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('動画を検索して結果を表示すべき', async ({ page }) => {
    // 検索クエリを入力
    await page.fill('[data-testid="search-input"]', 'eFootball 2024');

    // カテゴリを選択
    await page.selectOption('[data-testid="category-select"]', 'gameplay');

    // 検索ボタンをクリック
    await page.click('[data-testid="search-button"]');

    // ローディング完了を待機
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
    });

    // 結果が表示されることを確認
    await expect(page.locator('[data-testid="video-list"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="video-item"]')
    ).toHaveCount.greaterThan(0);

    // 動画情報が表示されることを確認
    const firstVideo = page.locator('[data-testid="video-item"]').first();
    await expect(
      firstVideo.locator('[data-testid="video-title"]')
    ).toBeVisible();
    await expect(
      firstVideo.locator('[data-testid="video-thumbnail"]')
    ).toBeVisible();
    await expect(
      firstVideo.locator('[data-testid="video-channel"]')
    ).toBeVisible();
  });

  test('空の検索結果を処理すべき', async ({ page }) => {
    // 結果が返されないものを検索
    await page.fill('[data-testid="search-input"]', 'xyzabc123nonexistent');
    await page.click('[data-testid="search-button"]');

    // ローディング完了を待機
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
    });

    // 空の状態が表示されることを確認
    await expect(page.locator('[data-testid="empty-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-results"]')).toContainText(
      '動画が見つかりませんでした'
    );
  });

  test('カテゴリでフィルターすべき', async ({ page }) => {
    // まずカテゴリなしで検索
    await page.fill('[data-testid="search-input"]', 'eFootball');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="video-list"]');

    const allResultsCount = await page
      .locator('[data-testid="video-item"]')
      .count();

    // 次にカテゴリでフィルター
    await page.selectOption('[data-testid="category-select"]', 'tips');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="video-list"]');

    const filteredResultsCount = await page
      .locator('[data-testid="video-item"]')
      .count();

    // フィルターされた結果は異なるべき（通常は少なくなる）
    expect(filteredResultsCount).not.toBe(allResultsCount);
  });
});
```

### 動画プレイヤー E2E テスト例

```javascript
// tests/e2e/specs/video-player-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('動画プレイヤーフロー', () => {
  test('動画を再生してコントロールを表示すべき', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 動画を検索して選択
    await page.fill('[data-testid="search-input"]', 'eFootball');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="video-list"]');
    await page.click('[data-testid="video-item"]', { first: true });

    // プレイヤーページの読み込みを待機
    await page.waitForURL('**/video/**');
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();

    // プレイヤーコントロールが存在することを確認
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-control"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="fullscreen-button"]')
    ).toBeVisible();

    // 再生機能をテスト
    await page.click('[data-testid="play-button"]');

    // 関連動画が表示されることを確認
    await expect(page.locator('[data-testid="related-videos"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="related-video-item"]')
    ).toHaveCount.greaterThan(0);
  });

  test('プレイヤーから動画をお気に入りに追加すべき', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 動画プレイヤーに移動
    await page.fill('[data-testid="search-input"]', 'eFootball');
    await page.click('[data-testid="search-button"]');
    await page.waitForSelector('[data-testid="video-list"]');
    await page.click('[data-testid="video-item"]', { first: true });

    // お気に入りに追加
    await page.click('[data-testid="favorite-button"]');

    // お気に入り状態を確認
    await expect(page.locator('[data-testid="favorite-button"]')).toHaveClass(
      /favorited/
    );

    // お気に入りページに移動
    await page.click('[data-testid="nav-favorites"]');
    await page.waitForURL('**/favorites');

    // 動画がお気に入りに表示されることを確認
    await expect(page.locator('[data-testid="favorite-item"]')).toHaveCount(1);
  });
});
```

## 🚀 パフォーマンステスト

### Artillery による負荷テスト

#### インストールとセットアップ

```bash
# Artilleryをグローバルにインストール
npm install -g artillery

# またはnpxを使用
npx artillery --version
```

#### 負荷テスト設定例

```yaml
# tests/load/api-load-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'ウォームアップ'
    - duration: 120
      arrivalRate: 50
      name: '負荷増加'
    - duration: 300
      arrivalRate: 100
      name: '持続負荷'
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: '動画検索'
    weight: 70
    flow:
      - get:
          url: '/api/videos/search'
          qs:
            q: 'eFootball'
            maxResults: 25
      - think: 2

  - name: '人気動画取得'
    weight: 20
    flow:
      - get:
          url: '/api/videos/popular'
          qs:
            maxResults: 25
      - think: 3

  - name: 'お気に入り管理'
    weight: 10
    flow:
      - post:
          url: '/api/favorites'
          json:
            userId: 'load-test-user-{{ $randomNumber() }}'
            video:
              id: 'test-video-{{ $randomNumber() }}'
              title: 'テスト動画'
              description: '負荷テスト動画'
              thumbnail:
                default: 'http://example.com/thumb.jpg'
              channelTitle: 'テストチャンネル'
              publishedAt: '2024-01-15T10:30:00Z'
              duration: 'PT10M30S'
              viewCount: 1000
              category: 'gameplay'
      - think: 1
```

#### 負荷テスト実行

```bash
# 負荷テストを実行
artillery run tests/load/api-load-test.yml

# カスタムターゲットで実行
artillery run tests/load/api-load-test.yml --target https://api.your-domain.com

# HTMLレポートを生成
artillery run tests/load/api-load-test.yml --output report.json
artillery report report.json
```

### フロントエンドパフォーマンステスト

#### Lighthouse CI

```bash
# Lighthouse CIをインストール
npm install -g @lhci/cli

# Lighthouse監査を実行
lhci autorun --upload.target=temporary-public-storage
```

#### パフォーマンステスト設定

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "startServerCommand": "npm run dev",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.8 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    }
  }
}
```

## 🔒 セキュリティテスト

### 依存関係脆弱性スキャン

```bash
# npm依存関係を監査
npm audit

# 脆弱性を自動修正
npm audit fix

# 古いパッケージを確認
npm outdated
```

### OWASP ZAP セキュリティテスト

```bash
# OWASP ZAPベースラインスキャンを実行
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

## 📊 テストカバレッジ

### カバレッジレポート

```bash
# フロントエンドのカバレッジレポートを生成
cd frontend && npm test -- --coverage

# バックエンドのカバレッジレポートを生成
cd backend && npm test -- --coverage

# カバレッジレポートを結合
npm run test:coverage
```

### カバレッジしきい値

```json
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 🔄 継続的インテグレーション

### GitHub Actions テストワークフロー

```yaml
# .github/workflows/test.yml
name: テストスイート

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3
      - name: Node.js ${{ matrix.node-version }} を使用
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: 依存関係をインストール
        run: |
          npm ci
          cd frontend && npm ci
          cd ../backend && npm ci
          cd ../tests && npm ci

      - name: フロントエンドテストを実行
        run: cd frontend && npm test -- --coverage --watchAll=false

      - name: バックエンドテストを実行
        run: cd backend && npm test -- --coverage --watchAll=false

      - name: Codecovにカバレッジをアップロード
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      localstack:
        image: localstack/localstack:latest
        ports:
          - 4566:4566
        env:
          SERVICES: dynamodb

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: 依存関係をインストール
        run: |
          npm ci
          cd tests && npm ci

      - name: アプリケーションを起動
        run: |
          docker-compose up -d --build
          sleep 30

      - name: 統合テストを実行
        run: cd tests && npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: 依存関係をインストール
        run: |
          npm ci
          cd tests && npm ci

      - name: Playwrightをインストール
        run: cd tests && npx playwright install --with-deps

      - name: アプリケーションを起動
        run: |
          docker-compose up -d --build
          sleep 30

      - name: E2Eテストを実行
        run: cd tests && npm run test:e2e

      - name: テスト結果をアップロード
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: tests/playwright-report/
```

## 🐛 テストデバッグ

### フロントエンドテストデバッグ

```bash
# 特定のテストをデバッグ
npm test -- --testNamePattern="should render" --verbose

# デバッガー付きでテストを実行
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Codeデバッガーを使用
# .vscode/launch.jsonに追加:
{
  "type": "node",
  "request": "launch",
  "name": "Jestテストをデバッグ",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### バックエンドテストデバッグ

```bash
# Node.jsインスペクターでデバッグ
node --inspect-brk node_modules/.bin/jest --runInBand

# デバッグ用にconsole.logを使用
console.log('デバッグ情報:', JSON.stringify(data, null, 2));
```

### E2E テストデバッグ

```bash
# ヘッドモードで実行
npx playwright test --headed

# デバッグモードで実行
npx playwright test --debug

# トレースを生成
npx playwright test --trace on
```

## 📚 ベストプラクティス

### テスト構成

- 関連するテストを describe ブロックでグループ化
- 説明的なテスト名を使用
- AAA パターン（Arrange、Act、Assert）に従う
- テストを独立して分離された状態に保つ

### モッキングガイドライン

- 外部依存関係をモック
- 内部コードには実装を使用
- テスト間でモックをリセット
- 関連する場合はモック呼び出しを検証

### パフォーマンス考慮事項

- 可能な場合はテストを並列実行
- 統合テストにはテストデータベースを使用
- テスト後にリソースをクリーンアップ
- テストデータセットアップを最適化

### メンテナンス

- コード変更に合わせてテストを最新に保つ
- 古いテストを削除
- 本番コードのようにテストコードをリファクタリング
- テスト実行時間を監視

---

詳細については、[メイン README](../README.md) または [開発ガイド](./DEVELOPMENT.md) を参照してください。

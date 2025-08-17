const SearchHistory = require('../SearchHistory');

describe('SearchHistory Model', () => {
    const validSearchHistoryData = {
        userId: 'test-user-id',
        query: 'eFootball gameplay',
        timestamp: '2023-01-01T00:00:00Z',
        category: 'gameplay',
        resultCount: 25
    };

    describe('validate', () => {
        it('should validate valid search history data', () => {
            const result = SearchHistory.validate(validSearchHistoryData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require user ID', () => {
            const data = {
                ...validSearchHistoryData,
                userId: ''
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('User ID is required and must be a non-empty string');
        });

        it('should require search query', () => {
            const data = {
                ...validSearchHistoryData,
                query: ''
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Search query is required and must be a non-empty string');
        });

        it('should require valid timestamp', () => {
            const data = {
                ...validSearchHistoryData,
                timestamp: 'invalid-date'
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Timestamp must be a valid ISO date string');
        });

        it('should require timestamp field', () => {
            const data = {
                ...validSearchHistoryData,
                timestamp: null
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Timestamp is required and must be a string');
        });

        it('should validate optional fields types', () => {
            const data = {
                ...validSearchHistoryData,
                category: 123,
                resultCount: 'invalid'
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Category must be a string');
            expect(result.errors).toContain('Result count must be a number');
        });

        it('should validate query length', () => {
            const data = {
                ...validSearchHistoryData,
                query: 'a'.repeat(501) // 501 characters
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Search query must be less than 500 characters');
        });

        it('should allow undefined optional fields', () => {
            const data = {
                userId: 'test-user-id',
                query: 'test query',
                timestamp: '2023-01-01T00:00:00Z'
            };
            const result = SearchHistory.validate(data);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('create', () => {
        it('should create search history instance with valid data', () => {
            const searchHistory = SearchHistory.create(validSearchHistoryData);
            expect(searchHistory).toBeInstanceOf(SearchHistory);
            expect(searchHistory.userId).toBe(validSearchHistoryData.userId);
            expect(searchHistory.query).toBe(validSearchHistoryData.query);
            expect(searchHistory.timestamp).toBe(validSearchHistoryData.timestamp);
            expect(searchHistory.category).toBe(validSearchHistoryData.category);
            expect(searchHistory.resultCount).toBe(validSearchHistoryData.resultCount);
        });

        it('should throw error with invalid data', () => {
            const invalidData = {
                ...validSearchHistoryData,
                userId: ''
            };
            expect(() => SearchHistory.create(invalidData)).toThrow('SearchHistory validation failed');
        });
    });

    describe('createNew', () => {
        it('should create new search history with current timestamp', () => {
            const beforeTime = new Date();
            const searchHistory = SearchHistory.createNew('user-123', 'test query', 'gameplay', 10);
            const afterTime = new Date();

            expect(searchHistory).toBeInstanceOf(SearchHistory);
            expect(searchHistory.userId).toBe('user-123');
            expect(searchHistory.query).toBe('test query');
            expect(searchHistory.category).toBe('gameplay');
            expect(searchHistory.resultCount).toBe(10);

            const timestampTime = new Date(searchHistory.timestamp);
            expect(timestampTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(timestampTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });

        it('should handle optional parameters', () => {
            const searchHistory = SearchHistory.createNew('user-123', 'test query');
            expect(searchHistory.category).toBe(null);
            expect(searchHistory.resultCount).toBe(0);
        });

        it('should trim query whitespace', () => {
            const searchHistory = SearchHistory.createNew('user-123', '  test query  ');
            expect(searchHistory.query).toBe('test query');
        });
    });

    describe('toObject', () => {
        it('should convert search history to plain object', () => {
            const searchHistory = new SearchHistory(validSearchHistoryData);
            const obj = searchHistory.toObject();
            expect(obj).toEqual({
                userId: validSearchHistoryData.userId,
                query: validSearchHistoryData.query,
                timestamp: validSearchHistoryData.timestamp,
                category: validSearchHistoryData.category,
                resultCount: validSearchHistoryData.resultCount
            });
        });

        it('should handle null category', () => {
            const data = {
                ...validSearchHistoryData,
                category: null
            };
            const searchHistory = new SearchHistory(data);
            const obj = searchHistory.toObject();
            expect(obj.category).toBe(null);
        });
    });

    describe('toDynamoDBItem', () => {
        it('should convert search history to DynamoDB item format', () => {
            const searchHistory = new SearchHistory(validSearchHistoryData);
            const item = searchHistory.toDynamoDBItem();
            expect(item).toEqual({
                userId: validSearchHistoryData.userId,
                query: validSearchHistoryData.query,
                timestamp: validSearchHistoryData.timestamp,
                category: validSearchHistoryData.category,
                resultCount: validSearchHistoryData.resultCount
            });
        });

        it('should exclude null category from DynamoDB item', () => {
            const data = {
                ...validSearchHistoryData,
                category: null
            };
            const searchHistory = new SearchHistory(data);
            const item = searchHistory.toDynamoDBItem();
            expect(item).not.toHaveProperty('category');
            expect(item.resultCount).toBe(validSearchHistoryData.resultCount);
        });
    });

    describe('fromDynamoDBItem', () => {
        it('should create search history from DynamoDB item', () => {
            const item = validSearchHistoryData;
            const searchHistory = SearchHistory.fromDynamoDBItem(item);
            expect(searchHistory).toBeInstanceOf(SearchHistory);
            expect(searchHistory.userId).toBe(item.userId);
            expect(searchHistory.query).toBe(item.query);
            expect(searchHistory.timestamp).toBe(item.timestamp);
            expect(searchHistory.category).toBe(item.category);
            expect(searchHistory.resultCount).toBe(item.resultCount);
        });

        it('should handle missing optional fields', () => {
            const item = {
                userId: 'test-user-id',
                query: 'test query',
                timestamp: '2023-01-01T00:00:00Z',
                resultCount: 5
            };
            const searchHistory = SearchHistory.fromDynamoDBItem(item);
            expect(searchHistory.category).toBe(null);
            expect(searchHistory.resultCount).toBe(5);
        });
    });
});
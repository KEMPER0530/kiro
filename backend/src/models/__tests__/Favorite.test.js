const Favorite = require('../Favorite');

describe('Favorite Model', () => {
    const validVideoData = {
        id: 'test-video-id',
        title: 'Test Video Title',
        description: 'Test video description',
        thumbnail: {
            default: 'https://example.com/default.jpg',
            medium: 'https://example.com/medium.jpg',
            high: 'https://example.com/high.jpg'
        },
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        duration: 'PT5M30S',
        viewCount: 1000,
        category: 'gameplay'
    };

    const validFavoriteData = {
        userId: 'test-user-id',
        videoId: 'test-video-id',
        video: validVideoData,
        addedAt: '2023-01-01T00:00:00Z'
    };

    describe('validate', () => {
        it('should validate valid favorite data', () => {
            const result = Favorite.validate(validFavoriteData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require user ID', () => {
            const data = {
                ...validFavoriteData,
                userId: ''
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('User ID is required and must be a non-empty string');
        });

        it('should require video ID', () => {
            const data = {
                ...validFavoriteData,
                videoId: ''
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Video ID is required and must be a non-empty string');
        });

        it('should require video object', () => {
            const data = {
                ...validFavoriteData,
                video: null
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Video object is required');
        });

        it('should validate embedded video object', () => {
            const data = {
                ...validFavoriteData,
                video: {
                    ...validVideoData,
                    id: ''
                }
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('Video validation failed');
        });

        it('should require valid addedAt date', () => {
            const data = {
                ...validFavoriteData,
                addedAt: 'invalid-date'
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Added date must be a valid ISO date string');
        });

        it('should require addedAt field', () => {
            const data = {
                ...validFavoriteData,
                addedAt: null
            };
            const result = Favorite.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Added date is required and must be a string');
        });
    });

    describe('create', () => {
        it('should create favorite instance with valid data', () => {
            const favorite = Favorite.create(validFavoriteData);
            expect(favorite).toBeInstanceOf(Favorite);
            expect(favorite.userId).toBe(validFavoriteData.userId);
            expect(favorite.videoId).toBe(validFavoriteData.videoId);
            expect(favorite.video).toBe(validFavoriteData.video);
            expect(favorite.addedAt).toBe(validFavoriteData.addedAt);
        });

        it('should throw error with invalid data', () => {
            const invalidData = {
                ...validFavoriteData,
                userId: ''
            };
            expect(() => Favorite.create(invalidData)).toThrow('Favorite validation failed');
        });
    });

    describe('createNew', () => {
        it('should create new favorite with current timestamp', () => {
            const beforeTime = new Date();
            const favorite = Favorite.createNew('user-123', validVideoData);
            const afterTime = new Date();

            expect(favorite).toBeInstanceOf(Favorite);
            expect(favorite.userId).toBe('user-123');
            expect(favorite.videoId).toBe(validVideoData.id);
            expect(favorite.video).toBe(validVideoData);

            const addedAtTime = new Date(favorite.addedAt);
            expect(addedAtTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
            expect(addedAtTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        });
    });

    describe('toObject', () => {
        it('should convert favorite to plain object', () => {
            const favorite = new Favorite(validFavoriteData);
            const obj = favorite.toObject();
            expect(obj).toEqual(validFavoriteData);
        });
    });

    describe('toDynamoDBItem', () => {
        it('should convert favorite to DynamoDB item format', () => {
            const favorite = new Favorite(validFavoriteData);
            const item = favorite.toDynamoDBItem();
            expect(item).toEqual(validFavoriteData);
        });
    });

    describe('fromDynamoDBItem', () => {
        it('should create favorite from DynamoDB item', () => {
            const item = validFavoriteData;
            const favorite = Favorite.fromDynamoDBItem(item);
            expect(favorite).toBeInstanceOf(Favorite);
            expect(favorite.userId).toBe(item.userId);
            expect(favorite.videoId).toBe(item.videoId);
            expect(favorite.video).toBe(item.video);
            expect(favorite.addedAt).toBe(item.addedAt);
        });
    });
});
const Video = require('../Video');

describe('Video Model', () => {
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

    describe('validate', () => {
        it('should validate valid video data', () => {
            const result = Video.validate(validVideoData);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require video ID', () => {
            const data = {
                ...validVideoData,
                id: ''
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Video ID is required and must be a non-empty string');
        });

        it('should require video title', () => {
            const data = {
                ...validVideoData,
                title: ''
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Video title is required and must be a non-empty string');
        });

        it('should require channel title', () => {
            const data = {
                ...validVideoData,
                channelTitle: ''
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Channel title is required and must be a non-empty string');
        });

        it('should require thumbnail object', () => {
            const data = {
                ...validVideoData,
                thumbnail: null
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Thumbnail object is required');
        });

        it('should require thumbnail URLs', () => {
            const data = {
                ...validVideoData,
                thumbnail: {
                    default: '',
                    medium: '',
                    high: ''
                }
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Thumbnail default URL is required');
            expect(result.errors).toContain('Thumbnail medium URL is required');
            expect(result.errors).toContain('Thumbnail high URL is required');
        });

        it('should validate optional fields types', () => {
            const data = {
                ...validVideoData,
                description: 123,
                viewCount: 'invalid'
            };
            const result = Video.validate(data);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Description must be a string');
            expect(result.errors).toContain('View count must be a number');
        });
    });

    describe('create', () => {
        it('should create video instance with valid data', () => {
            const video = Video.create(validVideoData);
            expect(video).toBeInstanceOf(Video);
            expect(video.id).toBe(validVideoData.id);
            expect(video.title).toBe(validVideoData.title);
        });

        it('should throw error with invalid data', () => {
            const invalidData = {
                ...validVideoData,
                id: ''
            };
            expect(() => Video.create(invalidData)).toThrow('Video validation failed');
        });
    });

    describe('toObject', () => {
        it('should convert video to plain object', () => {
            const video = new Video(validVideoData);
            const obj = video.toObject();
            expect(obj).toEqual({
                id: validVideoData.id,
                title: validVideoData.title,
                description: validVideoData.description,
                thumbnail: validVideoData.thumbnail,
                channelTitle: validVideoData.channelTitle,
                publishedAt: validVideoData.publishedAt,
                duration: validVideoData.duration,
                viewCount: validVideoData.viewCount,
                category: validVideoData.category
            });
        });

        it('should handle missing optional fields', () => {
            const minimalData = {
                id: 'test-id',
                title: 'Test Title',
                channelTitle: 'Test Channel',
                thumbnail: {
                    default: 'default.jpg',
                    medium: 'medium.jpg',
                    high: 'high.jpg'
                }
            };
            const video = new Video(minimalData);
            const obj = video.toObject();
            expect(obj.description).toBe('');
            expect(obj.publishedAt).toBe('');
            expect(obj.duration).toBe('');
            expect(obj.viewCount).toBe(0);
            expect(obj.category).toBe('');
        });
    });
});
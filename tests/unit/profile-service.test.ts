import { getProfile, getProfileById } from '../../src/lib/supabase/profile';
import { createClient } from '../../src/lib/supabase/server';

jest.mock('../../src/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('Profile Service (Server Side)', () => {
    const mockSingle = jest.fn();
    const mockEq = jest.fn(() => ({ single: mockSingle }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));
    const mockGetUser = jest.fn();

    const mockSupabase = {
        auth: {
            getUser: mockGetUser,
        },
        from: mockFrom,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('getProfile', () => {
        it('returns null if no user is authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } });
            const profile = await getProfile();
            expect(profile).toBeNull();
        });

        it('returns profile data if authenticated and exists', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
            mockSingle.mockResolvedValue({ data: { id: '123', username: 'testuser' }, error: null });

            const profile = await getProfile();
            expect(profile).toEqual({ id: '123', username: 'testuser' });
            expect(mockFrom).toHaveBeenCalledWith('profiles');
        });

        it('returns null if profile fetching fails', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
            mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

            const profile = await getProfile();
            expect(profile).toBeNull();
        });
    });

    describe('getProfileById', () => {
        it('returns profile for a specific ID', async () => {
            mockSingle.mockResolvedValue({ data: { id: '456', username: 'another' }, error: null });

            const profile = await getProfileById('456');
            expect(profile).toEqual({ id: '456', username: 'another' });
            expect(mockEq).toHaveBeenCalledWith('id', '456');
        });

        it('returns null if profile ID not found', async () => {
            mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
            const profile = await getProfileById('non-existent');
            expect(profile).toBeNull();
        });
    });
});

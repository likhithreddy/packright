import { editProfileSchema } from '@/types/edit-profile.schema';

describe('editProfileSchema', () => {
    const validData = {
        full_name: 'John Doe',
        avatar_theme: '#2E67A0',
        packing_style: 'Regular Packer',
    };

    it('validates correct data', () => {
        const result = editProfileSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('requires full_name to be at least 2 characters', () => {
        const result = editProfileSchema.safeParse({ ...validData, full_name: 'A' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
        }
    });

    it('requires avatar_theme to be non-empty', () => {
        const result = editProfileSchema.safeParse({ ...validData, avatar_theme: '' });
        expect(result.success).toBe(false);
    });

    it('requires packing_style to be non-empty', () => {
        const result = editProfileSchema.safeParse({ ...validData, packing_style: '' });
        expect(result.success).toBe(false);
    });
});

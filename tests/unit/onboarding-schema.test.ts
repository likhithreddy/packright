import { onboardingSchema } from '@/types/onboarding.schema';

describe('onboardingSchema', () => {
    const validData = {
        full_name: 'John Doe',
        username: 'john_doe123',
        avatar_theme: '#6366f1',
        packing_style: 'Minimalist',
    };

    it('validates correct data', () => {
        const result = onboardingSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('requires full name to be at least 3 characters', () => {
        const result = onboardingSchema.safeParse({ ...validData, full_name: 'Jo' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Full name must be at least 3 characters');
        }
    });

    it('validates username format', () => {
        const invalidUsernames = ['jo', 'user name', 'user!@#', 'a'.repeat(21)];
        invalidUsernames.forEach((username) => {
            const result = onboardingSchema.safeParse({ ...validData, username });
            expect(result.success).toBe(false);
        });
    });

    it('allows underscores in username', () => {
        const result = onboardingSchema.safeParse({ ...validData, username: 'valid_user_name' });
        expect(result.success).toBe(true);
    });

    it('requires avatar_theme and packing_style', () => {
        const resultTheme = onboardingSchema.safeParse({ ...validData, avatar_theme: '' });
        expect(resultTheme.success).toBe(false);

        const resultStyle = onboardingSchema.safeParse({ ...validData, packing_style: '' });
        expect(resultStyle.success).toBe(false);
    });
});

import { newTripSchema } from '../../src/types/new-trip.schema';

describe('New Trip Schema Validation', () => {
  it('validates a correct trip payload', () => {
    const validData = {
      title: 'Summer Europe Trip',
      destination: 'Paris, France',
      dateRange: {
        from: new Date('2026-06-01'),
        to: new Date('2026-06-15'),
      },
    };

    const result = newTripSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('fails when title is too short', () => {
    const data = {
      title: 'A',
      destination: 'Paris, France',
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
    };

    const result = newTripSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Title must be at least 2 characters long.');
    }
  });

  it('fails when destination is too short', () => {
    const data = {
      title: 'Trip',
      destination: 'X',
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
    };

    const result = newTripSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Destination must be at least 2 characters long.'
      );
    }
  });

  it('fails when dates are missing', () => {
    const data = {
      title: 'Trip',
      destination: 'Paris',
      dateRange: {
        from: 'not-a-date',
        to: undefined,
      },
    };

    const result = newTripSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates a payload with aiPrompt and items', () => {
    const data = {
      title: 'Camping Trip',
      destination: 'Yosemite',
      dateRange: {
        from: new Date('2026-07-01'),
        to: new Date('2026-07-05'),
      },
      aiPrompt: 'We are going hiking and camping for 5 days in July.',
      items: ['Tent', 'Sleeping Bag', 'Hiking Boots'],
    };

    const result = newTripSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('allows optional aiPrompt and items', () => {
    const data = {
      title: 'Quick Trip',
      destination: 'NYC',
      dateRange: {
        from: new Date(),
        to: new Date(),
      },
    };

    const result = newTripSchema.safeParse(data);
    expect(result.success).toBe(true);
    // Explicitly check that they are undefined but allowed
    if (result.success) {
      expect(result.data.aiPrompt).toBeUndefined();
      expect(result.data.items).toBeUndefined();
    }
  });
});

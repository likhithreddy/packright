import { getInitials } from '@/lib/profile-utils';

describe('getInitials', () => {
  it('returns "?" for null or undefined', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('returns "?" for empty or whitespace strings', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('returns the first character for single names', () => {
    expect(getInitials('Alex')).toBe('A');
    expect(getInitials('john')).toBe('J');
  });

  it('returns first and last initials for multiple names', () => {
    expect(getInitials('Alex Johnson')).toBe('AJ');
    expect(getInitials('John Quincy Adams')).toBe('JA');
    expect(getInitials('  First   Last  ')).toBe('FL');
  });

  it('handles lowercase names by capitalizing initials', () => {
    expect(getInitials('alex johnson')).toBe('AJ');
  });

  it('returns "?" for non-string types', () => {
    // @ts-ignore
    expect(getInitials(123)).toBe('?');
    // @ts-ignore
    expect(getInitials({})).toBe('?');
  });
});

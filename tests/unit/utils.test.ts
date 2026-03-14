import { cn, getUserDisplayName, getUserInitials } from '../../src/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined/null inputs', () => {
    expect(cn('foo', null, undefined)).toBe('foo');
  });

  it('handles empty inputs', () => {
    expect(cn('', 'foo')).toBe('foo');
  });

  it('handles multiple conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz', true && 'qux')).toBe('foo bar qux');
  });

  it('handles all falsey conditionals', () => {
    expect(cn('foo', false && 'bar', null && 'baz', undefined && 'qux')).toBe('foo');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });
});

describe('getUserDisplayName', () => {
  it('returns full_name when available', () => {
    expect(getUserDisplayName({ full_name: 'John Doe' }, 'user-1')).toBe('John Doe');
  });

  it('returns username when full_name is missing', () => {
    expect(getUserDisplayName({ username: 'johndoe' }, 'user-1')).toBe('johndoe');
  });

  it('returns userId slice when both are missing', () => {
    expect(getUserDisplayName({}, 'user-1')).toBe('User user');
  });

  it('handles null profile', () => {
    expect(getUserDisplayName(null, 'user-1')).toBe('User user');
  });

  it('handles undefined profile', () => {
    expect(getUserDisplayName(undefined, 'user-1')).toBe('User user');
  });

  it('prioritizes full_name over username', () => {
    expect(getUserDisplayName({ full_name: 'John Doe', username: 'johndoe' }, 'user-1')).toBe(
      'John Doe'
    );
  });

  it('handles empty full_name', () => {
    expect(getUserDisplayName({ full_name: '', username: 'johndoe' }, 'user-1')).toBe('johndoe');
  });

  it('handles empty username', () => {
    expect(getUserDisplayName({ username: '' }, 'user-1')).toBe('User user');
  });
});

describe('getUserInitials', () => {
  it('extracts initials from full_name', () => {
    expect(getUserInitials({ full_name: 'John Doe' }, 'user-1')).toBe('JD');
  });

  it('extracts first initial from single-word username', () => {
    expect(getUserInitials({ username: 'johndoe' }, 'user-1')).toBe('J');
  });

  it('returns first 2 chars of userId slice as fallback', () => {
    expect(getUserInitials({}, 'user-1')).toBe('UU');
  });

  it('handles null profile', () => {
    expect(getUserInitials(null, 'user-1')).toBe('UU');
  });

  it('handles undefined profile', () => {
    expect(getUserInitials(undefined, 'user-1')).toBe('UU');
  });

  it('handles single word names', () => {
    expect(getUserInitials({ full_name: 'Prince' }, 'user-1')).toBe('P');
  });

  it('handles three word names (takes first 2)', () => {
    expect(getUserInitials({ full_name: 'John Middle Doe' }, 'user-1')).toBe('JM');
  });

  it('handles names with extra spaces', () => {
    expect(getUserInitials({ full_name: '  John  Doe  ' }, 'user-1')).toBe('JD');
  });

  it('handles single character username', () => {
    expect(getUserInitials({ username: 'a' }, 'user-1')).toBe('A');
  });

  it('handles short userId', () => {
    expect(getUserInitials({}, 'u')).toBe('UU');
  });
});

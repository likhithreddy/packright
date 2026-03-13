/**
 * ISSUE-#45: Unit tests for useDebounce hook
 *
 * Tests debounce timing, cleanup, and multiple rapid calls
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

// Use fake timers to control setTimeout/setInterval
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should not update debounced value before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    // Rerender with new value
    rerender({ value: 'updated', delay: 300 });

    // Should still be initial value before delay
    expect(result.current).toBe('initial');
  });

  it('should update debounced value after delay', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    // Rerender with new value
    rerender({ value: 'updated', delay: 300 });

    // Fast-forward past the delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be updated now
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    // First update
    rerender({ value: 'update1', delay: 300 });

    // Advance partway through delay (not full 300ms)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should still be initial
    expect(result.current).toBe('initial');

    // Second update before first delay completes
    rerender({ value: 'update2', delay: 300 });

    // Advance remaining time from first timer (100ms more = 300ms total)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should still NOT be updated because timer was reset
    expect(result.current).toBe('initial');

    // Now advance the full 300ms for the second timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // NOW it should be updated to the second value
    expect(result.current).toBe('update2');
  });

  it('should use default delay of 300ms when not specified', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    // Advance less than 300ms
    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');

    // Advance to 300ms
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe('updated');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    // Trigger a value change that starts a timer
    rerender({ value: 'updated', delay: 300 });

    // Unmount before timer completes
    unmount();

    // clearTimeout should have been called
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should handle different types of values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 0, delay: 300 },
    });

    expect(result.current).toBe(0);

    rerender({ value: 42, delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it('should handle empty string', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'search', delay: 300 },
    });

    rerender({ value: '', delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('');
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: null as string | null, delay: 300 },
    });

    expect(result.current).toBe(null);

    rerender({ value: 'not null', delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('not null');

    rerender({ value: undefined as string | undefined, delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(undefined);
  });
});

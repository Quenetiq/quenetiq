import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RateLimitGate } from './rate-limit-gate';

describe('RateLimitGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children when not rate limited', () => {
    render(
      <RateLimitGate isLimited={false}>
        <p data-testid="content">Normal content</p>
      </RateLimitGate>,
    );

    expect(screen.getByTestId('content')).toBeDefined();
  });

  it('shows rate limit UI when limited', () => {
    render(
      <RateLimitGate isLimited={true} retryAfter={5000}>
        <p data-testid="content">Normal content</p>
      </RateLimitGate>,
    );

    expect(screen.queryByTestId('content')).toBeNull();
    expect(screen.getByText('Rate limit exceeded')).toBeDefined();
  });

  it('shows custom fallback instead of default UI', () => {
    render(
      <RateLimitGate isLimited={true} fallback={<p data-testid="custom">Custom fallback</p>}>
        <p data-testid="content">Normal content</p>
      </RateLimitGate>,
    );

    expect(screen.getByTestId('custom')).toBeDefined();
    expect(screen.queryByText('Rate limit exceeded')).toBeNull();
  });

  it('displays error message', () => {
    render(
      <RateLimitGate isLimited={true} error="Too many requests" retryAfter={3000}>
        <p>Normal content</p>
      </RateLimitGate>,
    );

    expect(screen.getByText('Too many requests')).toBeDefined();
  });

  it('counts down and calls onRetry when timer expires', () => {
    const onRetry = vi.fn();

    render(
      <RateLimitGate isLimited={true} retryAfter={2000} onRetry={onRetry}>
        <p>Normal content</p>
      </RateLimitGate>,
    );

    expect(screen.getByText('2s')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1900);
    });

    expect(screen.getByText('1s')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('cancels countdown when isLimited becomes false', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <RateLimitGate isLimited={true} retryAfter={5000} onRetry={onRetry}>
        <p>Normal content</p>
      </RateLimitGate>,
    );

    rerender(
      <RateLimitGate isLimited={false} retryAfter={5000} onRetry={onRetry}>
        <p>Normal content</p>
      </RateLimitGate>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onRetry).not.toHaveBeenCalled();
  });
});

/**
 * Unit tests for `LayoutNamesContext`.
 *
 * Coverage:
 *
 *   - Hook returns `null` outside a provider (the "no host
 *     opted in" sentinel that lets `FrontmatterEditor` fall
 *     back to plain-text input for unknown hosts).
 *   - Hook returns the names array when wrapped.
 *   - Provider memoises on array *contents*, not identity, so a
 *     parent that recomputes `Object.keys(...)` per render does
 *     not re-render every consumer.
 *   - `useLayoutsAreStrict` defaults `false`, can be overridden.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect } from 'react';

import { LayoutNamesProvider, useLayoutNames, useLayoutsAreStrict } from '../LayoutNamesContext';

describe('useLayoutNames', () => {
  it('returns null outside a provider', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useLayoutNames();
      return null;
    };
    render(<Probe />);
    expect(observed).toBeNull();
  });

  it('returns the names array inside a provider', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useLayoutNames();
      return null;
    };
    render(
      <LayoutNamesProvider names={['DetailTechnical', 'FullWidth']}>
        <Probe />
      </LayoutNamesProvider>
    );
    expect(observed).toEqual(['DetailTechnical', 'FullWidth']);
  });

  it('keeps context identity stable when names array re-allocates with same contents', () => {
    // The provider memoises on a sort+join signature so a
    // parent allocating a fresh array each render does NOT
    // cause every consumer to re-run effects keyed on the
    // hook's return value.
    const renderTimestamps: number[] = [];
    const Probe = () => {
      const names = useLayoutNames();
      useEffect(() => {
        renderTimestamps.push(Date.now());
      }, [names]);
      return null;
    };

    const Parent = ({ tick: _tick }: { tick: number }) => (
      <LayoutNamesProvider names={['DetailTechnical', 'FullWidth']}>
        <Probe />
      </LayoutNamesProvider>
    );

    const { rerender } = render(<Parent tick={1} />);
    rerender(<Parent tick={2} />);
    rerender(<Parent tick={3} />);

    // One initial run; zero subsequent runs because the
    // memoised value never changed identity.
    expect(renderTimestamps.length).toBe(1);
  });

  it('reseats context when names contents actually change', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useLayoutNames();
      return null;
    };
    const { rerender } = render(
      <LayoutNamesProvider names={['A']}>
        <Probe />
      </LayoutNamesProvider>
    );
    expect(observed).toEqual(['A']);

    rerender(
      <LayoutNamesProvider names={['A', 'B']}>
        <Probe />
      </LayoutNamesProvider>
    );
    expect(observed).toEqual(['A', 'B']);
  });
});

describe('useLayoutsAreStrict', () => {
  it('returns false outside a provider', () => {
    let observed: boolean | undefined;
    const Probe = () => {
      observed = useLayoutsAreStrict();
      return null;
    };
    render(<Probe />);
    expect(observed).toBe(false);
  });

  it('returns false by default inside a provider', () => {
    let observed: boolean | undefined;
    const Probe = () => {
      observed = useLayoutsAreStrict();
      return null;
    };
    render(
      <LayoutNamesProvider names={[]}>
        <Probe />
      </LayoutNamesProvider>
    );
    expect(observed).toBe(false);
  });

  it('returns true when the provider is strict', () => {
    let observed: boolean | undefined;
    const Probe = () => {
      observed = useLayoutsAreStrict();
      return null;
    };
    render(
      <LayoutNamesProvider names={[]} strict>
        <Probe />
      </LayoutNamesProvider>
    );
    expect(observed).toBe(true);
  });
});

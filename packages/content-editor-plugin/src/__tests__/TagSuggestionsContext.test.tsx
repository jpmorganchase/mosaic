/**
 * Unit tests for `TagSuggestionsContext`.
 *
 * Coverage:
 *
 *   - Hook returns `null` outside a provider (the "no host
 *     opted in" sentinel that lets `FrontmatterEditor` fall
 *     back to the no-suggestions ComboBox).
 *   - Hook returns the tag array when wrapped.
 *   - Provider memoises on array *contents*, not identity, so a
 *     parent that recomputes its tag list per render does not
 *     re-render every consumer.
 *   - Empty arrays are passed through (provider mounted with
 *     zero registered tags is a meaningful state — distinct from
 *     no provider — and the picker still renders).
 *   - Reseats the context value when the tag contents change.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect } from 'react';

import { TagSuggestionsProvider, useTagSuggestions } from '../TagSuggestionsContext';

describe('useTagSuggestions', () => {
  it('returns null outside a provider', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useTagSuggestions();
      return null;
    };
    render(<Probe />);
    expect(observed).toBeNull();
  });

  it('returns the tag array inside a provider', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useTagSuggestions();
      return null;
    };
    render(
      <TagSuggestionsProvider tags={['platform', 'blog', 'design-system']}>
        <Probe />
      </TagSuggestionsProvider>
    );
    expect(observed).toEqual(['platform', 'blog', 'design-system']);
  });

  it('returns an empty array when the provider is opted in with no tags', () => {
    // Distinct from the "no provider" case above — host has
    // signalled "I'm using suggestions" but currently has none
    // to offer. The editor still renders the ComboBox; we just
    // verify the hook surfaces `[]` not `null` so the picker
    // path is taken.
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useTagSuggestions();
      return null;
    };
    render(
      <TagSuggestionsProvider tags={[]}>
        <Probe />
      </TagSuggestionsProvider>
    );
    expect(observed).toEqual([]);
  });

  it('keeps context identity stable when tags array re-allocates with same contents', () => {
    // The provider memoises on a sort+join signature so a
    // parent allocating a fresh array each render does NOT
    // reseat the context value. Important because tag lists
    // are typically derived from larger data structures (e.g.
    // `useMemo(() => snapshot.pages.flatMap(p => p.tags), …)`)
    // that may legitimately re-run; we don't want every editor
    // row re-running its effects when the upstream identity
    // flips without a real content change.
    const observed: number[] = [];
    const Probe = () => {
      const tags = useTagSuggestions();
      useEffect(() => {
        observed.push(Date.now());
      }, [tags]);
      return null;
    };

    const Parent = ({ tick: _tick }: { tick: number }) => (
      // Fresh array literal each render — identity changes,
      // contents don't.
      <TagSuggestionsProvider tags={['a', 'b', 'c']}>
        <Probe />
      </TagSuggestionsProvider>
    );

    const { rerender } = render(<Parent tick={1} />);
    rerender(<Parent tick={2} />);
    rerender(<Parent tick={3} />);

    // One initial run; zero subsequent runs because the
    // memoised value never changed identity.
    expect(observed.length).toBe(1);
  });

  it('reseats context when tag contents actually change', () => {
    let observed: readonly string[] | null | undefined;
    const Probe = () => {
      observed = useTagSuggestions();
      return null;
    };
    const { rerender } = render(
      <TagSuggestionsProvider tags={['a']}>
        <Probe />
      </TagSuggestionsProvider>
    );
    expect(observed).toEqual(['a']);

    rerender(
      <TagSuggestionsProvider tags={['a', 'b']}>
        <Probe />
      </TagSuggestionsProvider>
    );
    expect(observed).toEqual(['a', 'b']);
  });
});

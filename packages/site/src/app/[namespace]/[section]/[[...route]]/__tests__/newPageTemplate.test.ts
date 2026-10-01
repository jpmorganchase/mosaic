/**
 * Unit tests for the new-page template module.
 *
 * Two narrow surfaces:
 *
 *   1. `buildNewPageTemplate(input)` — currently returns the
 *      built-in default. Test pins the shape (required keys,
 *      body skeleton) so that an integrator who replaces the
 *      function with their own per-folder branching does so
 *      against a documented contract rather than guessing.
 *
 *   2. `composeTemplate(template)` — wraps `gray-matter.stringify`.
 *      Test confirms the round-trip is byte-stable (the same
 *      shape goes back into `matter()` on the editor side, so a
 *      drift here means the editor would see a slightly different
 *      authored frontmatter than the save side wrote).
 *
 * No `next/dynamic`, no React, no I/O — just pure data.
 */
import { describe, expect, it } from 'vitest';
import matter from 'gray-matter';

import { buildNewPageTemplate, composeTemplate } from '../newPageTemplate';

const SAMPLE_INPUT = {
  title: 'My New Page',
  pathname: '/mosaic/configure/sources/my-new-page',
  parentFolder: '/mosaic/configure/sources'
};

describe('buildNewPageTemplate (default)', () => {
  it('seeds title from input', () => {
    const t = buildNewPageTemplate(SAMPLE_INPUT);
    expect(t.frontmatter.title).toBe('My New Page');
  });

  it('seeds a non-empty layout that matches an exported mosaic-layouts component', () => {
    // The seeded name must resolve to a real export from
    // `@jpmorganchase/mosaic-layouts` — a typo falls back to the
    // host's default and trips the FrontmatterEditor's unknown-
    // layout warning. Keep this assertion in lockstep with
    // `defaultTemplate`.
    const t = buildNewPageTemplate(SAMPLE_INPUT);
    expect(t.frontmatter.layout).toBe('DetailTechnical');
  });

  it('emits a body that references {meta.title} rather than inlining', () => {
    // Convention used across every existing page in the docs —
    // editing the frontmatter title later flows through to the
    // heading automatically.
    const t = buildNewPageTemplate(SAMPLE_INPUT);
    expect(t.body).toContain('# {meta.title}');
    expect(t.body).not.toContain('My New Page');
  });
});

describe('composeTemplate', () => {
  it('produces a parseable MDX file with frontmatter fence + body', () => {
    const t = buildNewPageTemplate(SAMPLE_INPUT);
    const bytes = composeTemplate(t);

    // The bytes must be round-trippable by gray-matter — the
    // editor parses with `matter()` on mount, so a drift here
    // would silently corrupt the authored frontmatter the
    // FrontmatterEditor displays.
    const { data, content } = matter(bytes);
    expect(data).toEqual(t.frontmatter);
    // gray-matter trims its own leading newlines; the body
    // contract is "everything after the closing fence, verbatim".
    expect(content.trimStart()).toBe(t.body);
  });

  it('quotes special characters in YAML scalars safely', () => {
    // gray-matter delegates to js-yaml. We're not testing js-yaml
    // itself, just that round-tripping survives the trickiest
    // common case (backticks in title).
    const t = composeTemplate({
      frontmatter: { title: 'Edge `case` value' },
      body: '# {meta.title}\n'
    });
    const { data } = matter(t);
    expect(data.title).toBe('Edge `case` value');
  });

  it('emits frontmatter keys in insertion order', () => {
    // Insertion order matters for the PR diff — a reorder on
    // every save would show the entire frontmatter block as
    // changed even when no value moved.
    const yaml = composeTemplate({
      frontmatter: { title: 'A', layout: 'Detail', custom: 'X' },
      body: ''
    });
    const titleIdx = yaml.indexOf('title:');
    const layoutIdx = yaml.indexOf('layout:');
    const customIdx = yaml.indexOf('custom:');
    expect(titleIdx).toBeLessThan(layoutIdx);
    expect(layoutIdx).toBeLessThan(customIdx);
  });
});

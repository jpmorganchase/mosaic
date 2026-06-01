import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 1 regression net — exercises the full edit-mode round-trip so any
 * future Lexical upgrade or editor refactor surfaces a failure here first.
 *
 * Requires `MOSAIC_DEV_FAKE_AUTH=true` and `NEXT_PUBLIC_ENABLE_LOGIN=true`
 * in the dev server's environment (see packages/site/.env.local). The
 * test signs in through the Auth.js Credentials provider that those env
 * vars register, so no GitHub OAuth app is needed.
 */

const EDITABLE_PAGE = '/mosaic/test/layouts/edit';

async function signInWithDevFake(page: Page) {
  await page.goto('/api/auth/signin');
  await page.getByRole('button', { name: /Sign in with Dev Fake Login/i }).click();
  // Auth.js redirects to whichever home page the site config defines
  // — historically `/`, currently `/mosaic/index`. Wait for ANY route
  // outside `/api/auth/**` rather than pinning to a specific URL so a
  // future home-route change doesn't break every editor test.
  await page.waitForURL(url => !url.pathname.startsWith('/api/auth'));
}

test.describe('editor (Lexical) — Phase 1 baseline', () => {
  test('renders the editor and a seeded preview when ?edit=1 is set', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    // Toolbar from packages/content-editor-plugin must mount.
    await expect(page.getByRole('toolbar', { name: /page editing toolbar/i })).toBeVisible({
      timeout: 15_000
    });

    // The editor's ContentEditable surface (Lexical adds contenteditable="true").
    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible();

    // The preview pane is seeded on mount (regression for the original
    // "blank preview until first keystroke" bug) — assert at least one
    // heading rendered from the page's MDX is visible in the preview.
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('typing into the editor updates the preview via the Server Action', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    const sentinel = `lexical-upgrade-smoke-${Date.now()}`;
    await editable.click();
    // Move to end so we don't clobber existing content.
    await editable.press('Control+End');
    await editable.press('End');
    await editable.type(`\n\n${sentinel}\n`);

    // PreviewPlugin debounces ~250ms and dispatches the action under
    // useTransition, so allow generous time for the round-trip.
    await expect(page.getByText(sentinel, { exact: false })).toBeVisible({ timeout: 10_000 });

    // No compile error banner should be up for valid markdown.
    await expect(page.getByText(/MDX compile error/i)).toHaveCount(0);
  });

  test('invalid MDX surfaces the structured error banner with a hint', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    // A bare `<` triggers the canonical "Unexpected end of file before name"
    // MDX error — our formatMdxError() attaches a hint for this case.
    await editable.type('\n\n<\n');

    await expect(page.getByText(/MDX compile error/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/escape it as `\\</i)).toBeVisible();
  });
});

test.describe('editor status pills — Phase 2', () => {
  test('save-state pill is hidden until the user types, then shows "Edited"', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    // Pill is absent before any edit (clean state renders nothing).
    await expect(page.locator('[data-state="dirty"]')).toHaveCount(0);
    await expect(page.locator('[data-state="saving"]')).toHaveCount(0);
    await expect(page.locator('[data-state="saved"]')).toHaveCount(0);

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    await editable.type('\n\nphase-2-dirty-marker');

    await expect(page.locator('[data-state="dirty"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Edited')).toBeVisible();
  });

  test('"Compiling…" appears while a preview action is in flight', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    const compiling = page.getByRole('status', { name: /Compiling preview/i });

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    // Type enough to defeat the 250 ms debounce so the request fires
    // and we can observe the pending state.
    await editable.type('phase-2 compile sentinel');

    // Race-tolerant assertion: catch it either while in flight or
    // immediately after settle. PreviewPlugin flips isCompiling on
    // entry and clears it in the action's `finally`, so the appearance
    // window is at least one render frame even for instant compiles.
    await expect(compiling).toBeVisible({ timeout: 5_000 });
    await expect(compiling).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('editor error highlighting — Phase 3', () => {
  test('invalid MDX highlights the offending block in the editor', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    // Same trigger as the structured-banner test — `<` alone is a
    // well-known MDX syntax error and our compile path reports a line
    // number for it, which is what ErrorHighlightPlugin needs to map.
    await editable.type('\n\n<\n');

    // Banner must show with a line number, otherwise highlighting is
    // moot (the plugin no-ops without one).
    await expect(page.getByText(/MDX compile error.*\(Ln \d+/)).toBeVisible({ timeout: 10_000 });

    // The plugin adds a known class to the block element. Asserting on
    // the class (rather than a computed style) keeps the test stable
    // across theme tweaks while still proving the wiring works end-to-
    // end: error → line map → NodeKey → DOM element.
    await expect(page.locator('.mosaic-editor-error-line').first()).toBeVisible({
      timeout: 5_000
    });
  });

  test('error banner exposes a clickable headline that focuses the editor', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    await editable.type('\n\n<\n');

    // The headline is rendered as a button with an aria-label that
    // includes the "Click to jump" affordance — assert on the
    // accessible name rather than a CSS selector so a future refactor
    // that swaps the Salt component still satisfies the contract.
    const jump = page.getByRole('button', { name: /Click to jump to the error/i });
    await expect(jump).toBeVisible({ timeout: 10_000 });
    await jump.click();

    // After clicking, focus should land somewhere inside the
    // contenteditable. Lexical may focus a child node rather than the
    // root, so check ancestor-or-self instead of strict equality.
    await expect
      .poll(
        async () =>
          await page.evaluate(() => {
            const active = document.activeElement;
            if (!active) return false;
            return !!active.closest('[contenteditable="true"]');
          }),
        { timeout: 5_000 }
      )
      .toBe(true);
  });

  test('highlight clears when the user fixes the markdown', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    await editable.type('\n\n<\n');

    const highlight = page.locator('.mosaic-editor-error-line');
    await expect(highlight.first()).toBeVisible({ timeout: 10_000 });

    // Remove the bad token. Undo is the most reliable way to revert
    // exactly the keystrokes we made without depending on cursor
    // position relative to other content.
    await page.keyboard.press('Control+Z');
    await page.keyboard.press('Control+Z');
    await page.keyboard.press('Control+Z');
    await page.keyboard.press('Control+Z');

    // Banner is dismissed by the next clean compile (setError(undefined)),
    // which in turn tears the highlight class back off via the plugin's
    // effect cleanup.
    await expect(page.getByText(/MDX compile error/i)).toHaveCount(0, { timeout: 10_000 });
    await expect(highlight).toHaveCount(0);
  });
});

test.describe('editor keyboard shortcuts — Phase 6', () => {
  test('Mod+S opens the save / PR dialog without triggering the browser save', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    // The dialog should not be mounted before the shortcut fires.
    // Salt portals the dialog at body root and uses role="dialog";
    // checking the dialog headline is the most stable assertion across
    // Salt versions (the role+name combination is part of the WAI-ARIA
    // contract that won't drift).
    await expect(page.getByRole('dialog', { name: /Save Changes/i })).toHaveCount(0);

    // Focus the editor first so the shortcut path goes through the
    // "active element is the editor's contentEditable" branch — i.e.
    // the realistic case: user is mid-typing when they hit save.
    await editable.click();
    await page.keyboard.press('ControlOrMeta+S');

    await expect(page.getByRole('dialog', { name: /Save Changes/i })).toBeVisible({
      timeout: 5_000
    });
  });

  test('toolbar Bold button advertises its shortcut via aria-keyshortcuts', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    // Bold button is the toolbar button with accessible name "Bold".
    // The shortcut machinery sets aria-keyshortcuts on the actual
    // <button>; on macOS the canonical value is `Meta+B`, on
    // Win/Linux Playwright runners it's `Control+B`. Match either to
    // keep the test stable across runner platforms (CI is Linux,
    // local dev is mac).
    const bold = page.getByRole('button', { name: 'Bold' });
    await expect(bold).toBeVisible({ timeout: 15_000 });
    const shortcut = await bold.getAttribute('aria-keyshortcuts');
    expect(shortcut).toMatch(/^(Meta|Control)\+B$/);
  });

  test('Mod+K opens the Insert Link dialog', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    await editable.click();
    await page.keyboard.press('ControlOrMeta+K');

    await expect(page.getByRole('dialog', { name: /Insert Link/i })).toBeVisible({
      timeout: 5_000
    });
  });

  test('Mod+/ toggles the shortcut-help dialog and it lists every binding', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    const dialog = page.getByRole('dialog', { name: /Keyboard shortcuts/i });

    // Not mounted before the shortcut fires.
    await expect(dialog).toHaveCount(0);

    // Open via shortcut.
    await editable.click();
    await page.keyboard.press('ControlOrMeta+/');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The dialog should list every action label from SHORTCUT_LABELS.
    // Asserting on visible text rather than rows keeps the test
    // resilient to markup changes (e.g. swapping <table> for a <ul>).
    await expect(dialog.getByText('Bold')).toBeVisible();
    await expect(dialog.getByText('Italic')).toBeVisible();
    await expect(dialog.getByText('Insert link')).toBeVisible();
    await expect(dialog.getByText(/Save \(open Pull Request dialog\)/)).toBeVisible();
    await expect(dialog.getByText('Show this shortcut help')).toBeVisible();

    // Toggle: a second press closes it again (matches VS Code / Linear
    // convention; useful for users who hit it by accident).
    await page.keyboard.press('ControlOrMeta+/');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('toolbar ? button opens the shortcut-help dialog', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const helpButton = page.getByRole('button', { name: 'Keyboard shortcuts' });
    await expect(helpButton).toBeVisible({ timeout: 15_000 });
    await helpButton.click();

    await expect(page.getByRole('dialog', { name: /Keyboard shortcuts/i })).toBeVisible({
      timeout: 5_000
    });
  });
});

test.describe('editor diff preview — Phase 9', () => {
  // Verifies the unified-diff "Review changes" accordion that the save
  // dialog renders against the on-disk markdown. We intentionally
  // exercise the no-changes case AND the with-changes case in
  // separate tests so a regression in either branch (snapshot timing,
  // accordion mounting, diff stat computation) is localised.

  test('shows "No changes" when the editor matches the saved file', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    // Open the save dialog without typing anything: the editor's
    // canonical-markdown export should equal the original body byte
    // for byte (Lexical's round-trip is stable for the seed doc),
    // so the diff section renders the "No changes" notice rather
    // than the accordion.
    await editable.click();
    await page.keyboard.press('ControlOrMeta+S');

    const dialog = page.getByRole('dialog', { name: /Save Changes/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await expect(
      dialog.getByText(/No changes — the editor matches the saved file\./i)
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Review changes/i })).toHaveCount(0);
  });

  test('shows a Review-changes accordion with stats after editing', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    const editable = page.locator('[contenteditable="true"]').first();
    await expect(editable).toBeVisible({ timeout: 15_000 });

    // Add a sentinel paragraph at the end so the diff has at least
    // one addition. Date-stamping keeps the sentinel unique across
    // retries so we can assert on it inside the diff body without
    // false matches against existing seed content.
    const sentinel = `phase-9-diff-sentinel-${Date.now()}`;
    await editable.click();
    await editable.press('Control+End');
    await editable.press('End');
    await editable.type(`\n\n${sentinel}\n`);

    // Wait out the dirty-tracker armed-after-first-update guard +
    // preview debounce so the editor is unambiguously dirty when
    // the dialog opens.
    await page.waitForTimeout(400);

    await page.keyboard.press('ControlOrMeta+S');

    const dialog = page.getByRole('dialog', { name: /Save Changes/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The accordion header shows aggregate stats. We don't assert
    // exact counts (Lexical may add a trailing newline or normalise
    // whitespace, which would shift removed-line counts depending
    // on Lexical version) — only that the additions count is at
    // least 1, since the sentinel guarantees it.
    const accordion = dialog.getByRole('button', { name: /Review changes/i });
    await expect(accordion).toBeVisible();
    await expect(accordion).toContainText(/\+\s*[1-9]/);

    // Expand the accordion and assert the sentinel is present in
    // the diff body — proves the accordion wires the snapshot
    // through to the renderer rather than just rendering header
    // stats.
    await accordion.click();
    await expect(dialog.getByText(sentinel)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('editor mode toggle — Phase 10', () => {
  // Verifies the source / WYSIWYG view toggle introduced in Phase
  // 10. Three behaviours are nailed down: (a) the toggle exists in
  // the toolbar and starts in WYSIWYG; (b) flipping to source
  // exposes a textarea seeded with markdown that round-trips; (c)
  // edits made in source survive a flip back to WYSIWYG (content
  // bridge); and (d) the URL persists the mode so reload restores
  // the user's choice.

  test('renders a Visual/Source toggle defaulting to Visual', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    // Wait for the editor to mount.
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000
    });

    const visual = page.getByRole('button', { name: /Visual editor \(WYSIWYG\)/i });
    const source = page.getByRole('button', { name: /Source editor \(raw markdown\)/i });

    await expect(visual).toBeVisible();
    await expect(source).toBeVisible();

    // ToggleButtonGroup renders the selected state as
    // aria-pressed="true". Salt may bind it differently across
    // versions, so accept either aria-pressed OR aria-checked.
    const visualPressed = await visual.getAttribute('aria-pressed');
    const visualChecked = await visual.getAttribute('aria-checked');
    expect(visualPressed === 'true' || visualChecked === 'true').toBeTruthy();
  });

  test('clicking Source swaps in a textarea seeded with the page markdown', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole('button', { name: /Source editor \(raw markdown\)/i }).click();

    // Source-mode textarea is the markdown editor.
    const textarea = page.getByLabel('Markdown source editor');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // The Lexical contentEditable should be unmounted in source
    // mode — exactly one of the two surfaces should exist.
    await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);

    // The seeded value should contain the page's heading text;
    // we don't assert exact content because Lexical's markdown
    // serialiser is what produces the source we see and it
    // normalises whitespace/escapes in version-dependent ways.
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(20);

    // URL persists the mode.
    await expect(page).toHaveURL(/[?&]mode=source\b/);
  });

  test('source-mode edits survive a flip back to Visual (content bridge)', async ({ page }) => {
    await signInWithDevFake(page);
    await page.goto(`${EDITABLE_PAGE}?edit=1`);

    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000
    });

    // Switch to source.
    await page.getByRole('button', { name: /Source editor \(raw markdown\)/i }).click();
    const textarea = page.getByLabel('Markdown source editor');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // Append a unique sentinel paragraph.
    const sentinel = `phase-10-source-bridge-${Date.now()}`;
    await textarea.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(`\n\n${sentinel}\n`);

    // Flip back to Visual. The bridge should carry the sentinel
    // across into Lexical, which the preview pane will render.
    await page.getByRole('button', { name: /Visual editor \(WYSIWYG\)/i }).click();
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({
      timeout: 5_000
    });

    // Sentinel should appear in the editor's contentEditable
    // (Lexical re-parsed the bridged markdown). Use the editor
    // root selector to scope and avoid matching the preview.
    const editorBody = page.locator('[data-mosaic-editor-root="true"] [contenteditable="true"]');
    await expect(editorBody.getByText(sentinel)).toBeVisible({ timeout: 5_000 });

    // URL no longer carries `mode=source`.
    await expect(page).not.toHaveURL(/[?&]mode=source\b/);
  });

  test('reloading with ?mode=source restores the source view', async ({ page }) => {
    await signInWithDevFake(page);
    // Deep-link directly to source mode — the URL is the source
    // of truth, so this should mount the textarea without ever
    // showing the WYSIWYG composer.
    await page.goto(`${EDITABLE_PAGE}?edit=1&mode=source`);

    await expect(page.getByLabel('Markdown source editor')).toBeVisible({
      timeout: 15_000
    });
    await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  });
});

test.describe('new-page authoring — Phase 13', () => {
  /**
   * End-to-end coverage for the New-Page flow.
   *
   * What we exercise:
   *   - The "+ New page" CTA appears in the header after sign-in.
   *   - The dialog accepts a parent folder + filename + title
   *     and produces the expected `<route>?new=1&title=<encoded>`
   *     URL on Create.
   *   - The site's `[...route]/page.tsx` catch-all takes the
   *     create branch (the route doesn't exist on disk) and
   *     mounts the editor seeded with the title in an H1.
   *   - Opening the save dialog in create mode swaps its title
   *     + CTA to "Create Page" wording.
   *
   * What we do NOT exercise: actually submitting the create.
   * That requires a live `MOSAIC_WORKFLOWS_URL` backend speaking
   * the save-channel protocol, which the dev server doesn't have
   * configured. We assert the CTA is enabled (proving the
   * change-detection guard passed) and stop there.
   */
  test('launches the New-Page dialog and seeds the editor at the chosen route', async ({
    page
  }) => {
    await signInWithDevFake(page);

    const newPageButton = page.getByRole('button', { name: /create a new page/i });
    await expect(newPageButton).toBeVisible({ timeout: 10_000 });
    await newPageButton.click();

    // Dialog title is the unambiguous handle on the dialog —
    // matching on field labels would also catch unrelated forms.
    await expect(page.getByRole('heading', { name: /^New page$/i })).toBeVisible();

    await page.getByLabel(/parent folder/i).fill('/docs/test-pages');
    await page.getByLabel(/^filename$/i).fill('phase-13-e2e');
    await page.getByLabel(/^title$/i).fill('Phase 13 E2E Test');

    await page.getByRole('button', { name: /^Create$/i }).click();

    await page.waitForURL(
      url =>
        url.pathname === '/docs/test-pages/phase-13-e2e.mdx' &&
        url.searchParams.get('new') === '1' &&
        url.searchParams.get('title') === 'Phase 13 E2E Test',
      { timeout: 10_000 }
    );

    // The editor mounts (seeded with the blank-page template)
    // and the H1 we asked for appears either in the editor
    // surface or the preview pane. Asserting on text rather
    // than a specific role keeps the test resilient to whether
    // the editor surfaces the heading in Lexical's
    // contenteditable or the preview's rendered `<h1>`.
    await expect(page.getByText('Phase 13 E2E Test').first()).toBeVisible({ timeout: 15_000 });
  });

  test('save dialog uses create-page wording in new-page mode', async ({ page }) => {
    await signInWithDevFake(page);

    // Drive the editor straight into `?new=1` rather than going
    // through the dialog — this test is about the save-dialog
    // wording, and the dialog launch is already covered above.
    await page.goto(
      '/docs/test-pages/phase-13-save-dialog.mdx?new=1&title=' +
        encodeURIComponent('Save Dialog Wording Test')
    );

    await expect(page.getByRole('toolbar', { name: /page editing toolbar/i })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole('button', { name: /^Save$/i }).click();

    await expect(page.getByRole('heading', { name: /^Create Page$/i })).toBeVisible();
    const createCta = page.getByRole('button', { name: /^Create Page$/i });
    await expect(createCta).toBeVisible();

    // The change-detection guard should have already accepted
    // (the seeded H1 + title-bearing frontmatter is enough
    // content for the create branch's "non-empty body or
    // frontmatter" check). We stop here — clicking would try
    // to hit the workflows backend, which the dev server isn't
    // configured for in CI.
    await expect(createCta).toBeEnabled();
  });
});

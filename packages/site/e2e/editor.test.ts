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
  // Auth.js redirects back to '/' after a successful Credentials sign-in.
  await page.waitForURL('**/');
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



import { expect, test, type Page } from '@playwright/test';

const route = '/mosaic/test/layouts/detail-technical';
const heading = 'heading-2';

async function headingPosition(page: Page) {
  return page.evaluate(
    id => ({
      top: document.getElementById(id)!.getBoundingClientRect().top,
      headerBottom: document.querySelector('header')!.getBoundingClientRect().bottom
    }),
    heading
  );
}

test('keyboard TOC navigation moves focus into the destination section', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
  await page.locator(`#${heading}`).evaluate(element => {
    const action = document.createElement('button');
    action.textContent = 'Action in this section';
    element.after(action);
  });
  const link = page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'Heading 2', exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`#${heading}$`));
  await expect(page.locator(`#${heading}`)).toBeFocused();
  await expect(page.locator(`#${heading}`)).toMatchAriaSnapshot('- heading "Heading 2" [level=2]');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Action in this section' })).toBeFocused();
  await expect(page.locator(`#${heading}`)).not.toHaveAttribute('tabindex');
});

test('TOC links account for positioned ancestors and track the reached section', async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
  await page.locator('main main').evaluate(main => {
    main.style.position = 'relative';
    main.style.paddingTop = '120px';
  });
  const link = page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'Heading 2', exact: true });
  await link.click();
  await expect(page).toHaveURL(new RegExp(`#${heading}$`));
  await expect
    .poll(async () => {
      const position = await headingPosition(page);
      return Math.abs(position.top - position.headerBottom);
    })
    .toBeLessThanOrEqual(2);
  await expect(link).toHaveClass(/saltNavigationItem-active/);

  // A late block changes heading positions without changing the TOC item count.
  await page.locator('main main').evaluate(main => {
    const spacer = document.createElement('div');
    spacer.style.height = '180px';
    main.prepend(spacer);
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await link.click();
  await expect
    .poll(async () => {
      const position = await headingPosition(page);
      return Math.abs(position.top - position.headerBottom);
    })
    .toBeLessThanOrEqual(2);
  await expect(link).toHaveClass(/saltNavigationItem-active/);
});

for (const javaScriptEnabled of [false, true]) {
  test(`direct heading links clear the header with JavaScript ${javaScriptEnabled}`, async ({
    browser,
    baseURL
  }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled });
    try {
      const page = await context.newPage();
      await page.goto(`${route}#${heading}`);
      await expect
        .poll(async () => {
          const position = await headingPosition(page);
          return Math.abs(position.top - position.headerBottom);
        })
        .toBeLessThanOrEqual(2);
    } finally {
      await context.close();
    }
  });
}

/**
 * Smoke tests for {@link StatusBanner}.
 *
 * Focus on the dismissal contract — the rest (headline format,
 * jump-to-error wiring, raw-detail disclosure) is straightforward
 * markup and falls under e2e coverage.
 *
 * The dismiss-by-signature behaviour is the one place this
 * component carries non-trivial state, and it's easy to regress in
 * a way that's hard to spot manually (e.g. dismissing once and then
 * forever silencing the banner for the rest of the session).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type ErrorShape = {
  message: string;
  line?: number;
  column?: number;
  hint?: string;
  raw?: string;
} | null;

let mockError: ErrorShape = null;

vi.mock('../../EditorContext', () => ({
  useErrorMessage: () => ({ error: mockError })
}));

// `invokeFocusErrorHandle` is a side-effect — register a spy so we
// can confirm the jump-to-error button wires through, but don't
// exercise its real registry behaviour.
const invokeFocusErrorHandle = vi.fn();
vi.mock('../../utils/focusErrorRegistry', () => ({
  invokeFocusErrorHandle: () => invokeFocusErrorHandle()
}));

// Dynamic import so the mocks above land before the module is read.
const importStatusBanner = async () => (await import('../StatusBanner')).default;

beforeEach(() => {
  mockError = null;
  invokeFocusErrorHandle.mockReset();
});

afterEach(() => {
  mockError = null;
});

describe('StatusBanner', () => {
  it('renders nothing when there is no error', async () => {
    const StatusBanner = await importStatusBanner();
    const { container } = render(<StatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the headline with Ln/Col when error has a line+column', async () => {
    mockError = { message: 'Unexpected token', line: 12, column: 4 };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    expect(
      screen.getByText(/MDX compile error \(Ln 12, Col 4\): Unexpected token/)
    ).toBeInTheDocument();
  });

  it('omits the Ln/Col suffix when no line is available', async () => {
    mockError = { message: 'Parse failure' };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    expect(screen.getByText(/MDX compile error: Parse failure/)).toBeInTheDocument();
    // No `(Ln ...)` substring — bracket character is the cheapest probe.
    expect(screen.queryByText(/\(Ln /)).not.toBeInTheDocument();
  });

  it('shows the plain-English hint when present', async () => {
    mockError = { message: 'x', hint: 'Did you forget a closing brace?' };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    expect(screen.getByText('Did you forget a closing brace?')).toBeInTheDocument();
  });

  it('only shows "Jump to error" when the error has a line number', async () => {
    mockError = { message: 'x' };
    const StatusBanner = await importStatusBanner();
    const { rerender } = render(<StatusBanner />);
    expect(screen.queryByRole('button', { name: 'Jump to error' })).not.toBeInTheDocument();

    mockError = { message: 'x', line: 1 };
    rerender(<StatusBanner />);
    expect(screen.getByRole('button', { name: 'Jump to error' })).toBeInTheDocument();
  });

  it('toggles raw-error details via "Show details" disclosure', async () => {
    mockError = { message: 'short', raw: 'verbose stack with internals' };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    const toggle = screen.getByRole('button', { name: 'Show details' });
    expect(screen.queryByText(/verbose stack/)).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByText(/verbose stack/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByText(/verbose stack/)).not.toBeInTheDocument();
  });

  it('hides the banner when Dismiss is clicked', async () => {
    mockError = { message: 'oops', line: 3, column: 1 };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    expect(screen.getByText(/MDX compile error/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss error banner' }));
    expect(screen.queryByText(/MDX compile error/)).not.toBeInTheDocument();
  });

  it('keeps dismissing identical errors but re-shows on a different one', async () => {
    // This is the signature-keyed dismissal contract: the user has
    // seen the banner once, dismissed it, and the same error
    // recompiling should NOT bring it back. A different error
    // (different message OR line OR column) SHOULD.
    mockError = { message: 'oops', line: 3, column: 1 };
    const StatusBanner = await importStatusBanner();
    const { rerender } = render(<StatusBanner />);

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss error banner' }));
    expect(screen.queryByText(/MDX compile error/)).not.toBeInTheDocument();

    // Identical signature → stays hidden.
    mockError = { message: 'oops', line: 3, column: 1 };
    rerender(<StatusBanner />);
    expect(screen.queryByText(/MDX compile error/)).not.toBeInTheDocument();

    // Different line → re-appears.
    mockError = { message: 'oops', line: 4, column: 1 };
    rerender(<StatusBanner />);
    expect(screen.getByText(/MDX compile error/)).toBeInTheDocument();
  });

  it('clears the dismissal record when the error resolves', async () => {
    // After a successful compile (`error === null`), the next error
    // — even one identical to a previously-dismissed one — must
    // surface again. We never want to silently swallow errors
    // across a compile-clean-compile-error cycle.
    mockError = { message: 'oops', line: 3, column: 1 };
    const StatusBanner = await importStatusBanner();
    const { rerender } = render(<StatusBanner />);

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss error banner' }));

    // Successful compile.
    mockError = null;
    rerender(<StatusBanner />);

    // Same error returns — must re-show.
    mockError = { message: 'oops', line: 3, column: 1 };
    rerender(<StatusBanner />);
    expect(screen.getByText(/MDX compile error/)).toBeInTheDocument();
  });

  it('routes "Jump to error" through the focus registry', async () => {
    mockError = { message: 'x', line: 1, column: 1 };
    const StatusBanner = await importStatusBanner();
    render(<StatusBanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Jump to error' }));
    expect(invokeFocusErrorHandle).toHaveBeenCalledOnce();
  });
});

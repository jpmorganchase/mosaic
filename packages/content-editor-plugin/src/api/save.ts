export function save(
  user: { sid: string; name: string; email: string },
  route: string,
  markdown: string,
  persistUrl: string
) {
  return fetch(persistUrl, {
    method: 'POST',
    body: JSON.stringify({ user, route, markdown, name: 'save' }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
  });
}

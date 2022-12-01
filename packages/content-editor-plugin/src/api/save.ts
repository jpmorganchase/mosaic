export function save(
  user: { sid: string; name: string; email: string },
  route: string,
  markdown: string
) {
  /** TODO: fixup with Pull Docs host URL  */
  return fetch('http://localhost:8080/savecontent', {
    method: 'POST',
    body: JSON.stringify({ user, route, markdown }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
  });
}

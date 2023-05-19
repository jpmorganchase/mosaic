export async function waitForFonts() {
  const ready = await document.fonts.ready;
  ready.check('18px Open Sans');
  // eslint-disable-next-line no-promise-executor-return
  await new Promise(resolve => setTimeout(resolve, 5000));
  return true;
}

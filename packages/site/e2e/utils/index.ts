export async function waitForFonts() {
  const ready = await document.fonts.ready;
  ready.check('18px Open Sans');
  await new Promise(resolve => setTimeout(resolve, 5000));
  return true;
}

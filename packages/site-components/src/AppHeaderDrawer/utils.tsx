const parseMenuItems = menu =>
  menu.map(item => {
    const parsedItem = {
      id: item.link || false,
      name: item.title
    };
    if (item.links && item.links.length > 0) {
      const childNodes = parseMenuItems(item.links);
      return { ...parsedItem, childNodes };
    }
    return parsedItem;
  });

export const parseMenu = (menu, path = '/') => {
  if (!menu || !menu.length) return { items: [], path };
  const current = path;
  const items = parseMenuItems(menu);
  return { items, current };
};

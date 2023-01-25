import createContent from './createContent';
const createModulesIndex = async (contentRoot, pagePath, route) => {
  const className = 'typedoc-modules-page';
  const descriptor = await createContent(contentRoot, pagePath, route, className);
  return {
    content: descriptor.content,
    meta: {
      ...descriptor.meta,
      data: {
        ...descriptor.meta.data,
        api: {
          $ref: '../index#/data/api'
        },
        pageType: 'index',
        title: 'Modules'
      },
      sidebar: { exclude: false },
      title: 'Modules'
    }
  };
};
export default createModulesIndex;

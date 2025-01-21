import { useMeta, useStore } from '@jpmorganchase/mosaic-store';

export const withHeroAdapter = Component => () => {
  const {
    meta: { title, description }
  } = useMeta();

  // @ts-ignore
  const { image, links } = useStore(store => store.data.hero);

  return <Component title={title} description={description} image={image} links={links} />;
};

import useContentEditor from '../store/index';

export const ContentPreview = ({ children }) => {
  const { previewContent } = useContentEditor();

  return previewContent || children;
};

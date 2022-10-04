import sanitizeHtml from 'sanitize-html';

import toMarkdown from './toMarkdown';
import type { ConveySection } from './index';

export const createReleaseNote = ({
  originalSubject: originalSubjectProp,
  product: productProp,
  sections,
  time
}: {
  originalSubject: string;
  product: string;
  sections: ConveySection[];
  time: string;
}) => {
  const product = sanitizeHtml(productProp);
  const originalSubject = sanitizeHtml(originalSubjectProp);
  const hero = `<Hero datestampLabel="Published" datestamp="${new Date(
    time
  ).toLocaleString()}" eyebrow="${product}" title="${originalSubject}" variant="fullWidth"/>`;
  const content = sections.reduce(
    (result: Array<string>, section: ConveySection) => {
      const subheading = sanitizeHtml(section.subheading);
      const body = toMarkdown(section.body).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      result.push(`## ${subheading}`);
      result.push(body);
      return result;
    },
    [hero]
  );
  return content;
};

export const createReleaseNotePreview = ({ sections }: { sections: ConveySection[] }) => {
  const preview = sections?.length && sections[0].body ? toMarkdown(sections[0].body) : '';
  return preview;
};

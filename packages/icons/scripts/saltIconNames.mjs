import fs from 'node:fs';
import path from 'node:path';

const typesPath = path.join(process.cwd(), 'types/saltIconNames.d.ts');

function writeIconType(icons) {
  const iconItems = icons.sort().map((icon, index) => {
    const sep = index < icons.length ? '|' : '';
    return `  ${sep} '${icon}'`;
  });
  return `export type saltIconNames =
${iconItems.join('\n')};
`;
}

export const saltIconNames = {
  name: 'iconEnum',
  setup(build) {
    const icons = [];
    build.onLoad({ filter: /components/ }, async args => {
      let iconName = path.basename(args.path, '.js');
      iconName = `${iconName[0].toLowerCase()}${iconName.substring(1)}`;
      icons.push(iconName);
    });
    build.onEnd(() => {
      fs.writeFile(typesPath, writeIconType(icons), err => {
        if (err) {
          console.log(err);
        }
      });
    });
  }
};
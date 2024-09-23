import { expect, describe, test, afterEach, vi, beforeEach } from 'vitest';

import fsExtra from 'fs-extra';
import mockFs from 'mock-fs';
import path from 'path';
import DocumentAssetsPlugin from '../DocumentAssetsPlugin';

describe('GIVEN the LocalImagePlugin', () => {
  describe('afterUpdate', () => {
    const srcDir = './src';
    const outputDir = './public';
    const assetSubDirs = ['**/images'];

    beforeEach(() => {
      vi.spyOn(process, 'cwd').mockReturnValue('/mocked/cwd');
      mockFs({
        '/mocked/cwd/src': {
          images: {
            'image1.png': 'file content',
            'image2.jpg': 'file content'
          }
        },
        './public': {}
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
      mockFs.restore();
    });

    test('should process image directories and call symlink with correct arguments', async () => {
      const symlinkMock = vi.spyOn(fsExtra, 'symlink').mockResolvedValue(undefined);

      await DocumentAssetsPlugin.afterUpdate(null, null, { assetSubDirs, srcDir, outputDir });

      const outputPathImage1 = path.join(process.cwd(), outputDir, 'images', 'image1.png');
      const outputPathImage2 = path.join(process.cwd(), outputDir, 'images', 'image2.jpg');
      const srcPathImage1 = path.join(process.cwd(), srcDir, 'images', 'image1.png');
      const srcPathImage2 = path.join(process.cwd(), srcDir, 'images', 'image2.jpg');

      // assert that symlink was called with correct arguments
      expect(symlinkMock).toHaveBeenCalledWith(srcPathImage1, outputPathImage1);
      expect(symlinkMock).toHaveBeenCalledWith(srcPathImage2, outputPathImage2);
    });

    test('should handle errors gracefully and continue processing other files', async () => {
      const symlinkMock = vi
        .spyOn(fsExtra, 'symlink')
        .mockImplementationOnce((src: fsExtra.PathLike, _dest) => {
          if (`${src}`.includes('image1.png')) {
            throw new Error('Symlink error');
          }
          return Promise.resolve();
        });

      console.error = vi.fn();

      await DocumentAssetsPlugin.afterUpdate(null, null, { assetSubDirs, srcDir, outputDir });

      const outputPathImage2 = path.join(process.cwd(), outputDir, 'images', 'image2.jpg');
      const srcPathImage2 = path.join(process.cwd(), srcDir, 'images', 'image2.jpg');

      // assert that a single error does not break the plugin
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing image1.png'),
        expect.any(Error)
      );
      expect(symlinkMock).toHaveBeenCalledWith(srcPathImage2, outputPathImage2);
    });

    test('should throw an error if outputDir is not below process.cwd()', async () => {
      const options = {
        srcDir: './docs',
        outputDir: '/outside/cwd/public'
      };

      await expect(DocumentAssetsPlugin.afterUpdate({}, {}, options)).rejects.toThrow(
        'outputDir must be within the current working directory'
      );
    });
  });

  describe('$afterSource', () => {
    const srcDir = '/src';
    const outputDir = './public';
    const pages = [
      // relative path `.` - should re-map URL to public images
      {
        fullPath: '/path/to/page1.mdx',
        route: '/namespace/subdir1/page1',
        content: '![alt text](./images/image1.png)'
      },
      // relative path `..` - should re-map URL to public images
      {
        fullPath: '/path/to/page2.mdx',
        route: '/namespace/subdir1/subdir2/page2',
        content: '![alt text](../images/image2.png)'
      },
      // No leading slash - should treat as relative path
      {
        fullPath: '/path/to/page3.mdx',
        route: '/namespace/page3',
        content: '![alt text](images/image3.jpg)'
      },
      // No leading slash with extra level - should treat as relative path
      {
        fullPath: '/path/to/page4.mdx',
        route: '/namespace/subdir1/page4',
        content: '![alt text](images/image4.png)'
      },
      // Ignored .txt - should remain un-changed
      {
        fullPath: '/path/to/page5.txt',
        route: '/namespace/page5',
        content: '![alt text](images/image5.png)'
      },
      // ignored path - should remain un-changed
      {
        fullPath: '/path/to/ignore.mdx',
        route: '/namespace/ignore.mdx',
        content: '![alt text](images/image6.png)'
      },
      // http address - should remain un-changed
      {
        fullPath: '/path/to/page7.mdx',
        route: '/namespace/page7',
        content: '![alt text](https://www.saltdesignsystem.com/img/hero_image.svg)'
      }
    ];
    const ignorePages = ['/path/to/ignore.mdx'];
    const pageExtensions = ['.mdx'];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    test('should return pages if .mdx is not included in pageExtensions', async () => {
      const result = await DocumentAssetsPlugin.$afterSource(
        pages,
        {
          ignorePages,
          pageExtensions: ['.txt']
        },
        { srcDir, outputDir }
      );
      expect(result).toEqual(pages);
    });

    test('should process .mdx pages and update their content', async () => {
      const result = await DocumentAssetsPlugin.$afterSource(
        pages,
        { ignorePages, pageExtensions },
        { srcDir, outputDir }
      );
      expect(result.length).toEqual(7);
      expect(result[0].content).toBe('![alt text](/images/namespace/subdir1/images/image1.png)\n');
      expect(result[1].content).toBe('![alt text](/images/namespace/subdir1/images/image2.png)\n');
      expect(result[2].content).toBe('![alt text](/images/namespace/images/image3.jpg)\n');
      expect(result[3].content).toBe('![alt text](/images/namespace/subdir1/images/image4.png)\n');
      expect(result[4].content).toBe('![alt text](images/image5.png)');
      expect(result[5].content).toBe('![alt text](images/image6.png)');
      expect(result[6].content).toBe(
        '![alt text](https://www.saltdesignsystem.com/img/hero_image.svg)\n'
      );
    });
  });
});

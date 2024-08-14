'use babel';
import { homedir } from 'os';
import * as Path from 'path';
import * as FS from 'fs';
import {
  copyFileToDir,
  // copyFileToTempDir,
  // openAndSetProjectDir,
  // wait
} from './helpers';
import rimraf from 'rimraf';
import linterEslintNode from '../lib/main';

const root = Path.normalize(homedir());
const paths = {
  eslint7: Path.join(root, 'with-eslint-7'),
  eslint8: Path.join(root, 'with-eslint-8'),
  eslintLatest: Path.join(root, 'with-eslint-latest')
};

const packagesRoot = Path.join(root, '.pulsar', 'packages');
const fixtureRoot = Path.join(__dirname, 'fixtures');

if (process.env.CI) {

  describe('ESLint version testing', () => {
    const linterProvider = linterEslintNode.provideLinter();
    const { lint } = linterProvider;

    describe('ESLint 8', () => {
      describe('with-config', () => {
        let files = ['bad.js', '.eslintrc.js'];
        beforeAll(() => {
          for (let file of files) {
            copyFileToDir(
              Path.join(fixtureRoot, 'files', 'with-config', file),
              paths.eslint8
            );
          }
        });

        afterAll(() => {
          for (let file of files) {
            rimraf.sync(Path.join(paths.eslint8), file);
          }
        });

        describe('checks bad.js and', () => {
          let editor = null;
          beforeEach(async () => {
            editor = await atom.workspace.open(paths.bad);
            atom.project.setPaths([paths.eslint8]);
          });

          it('verifies the messages', async () => {
            const messages = await lint(editor);
            expect(messages.length).toBe(2);

            const expected0 = "'foo' is not defined. (no-undef)";
            const expected0Url = 'https://eslint.org/docs/latest/rules/no-undef';
            const expected1 = 'Extra semicolon. (semi)';
            const expected1Url = 'https://eslint.org/docs/latest/rules/semi';

            expect(messages[0].severity).toBe('error');
            expect(messages[0].excerpt).toBe(expected0);
            expect(messages[0].url).toBe(expected0Url);
            expect(messages[0].location.file).toBe(paths.bad);
            expect(messages[0].location.position).toEqual([[0, 0], [0, 3]]);
            expect(messages[0].solutions).not.toBeDefined();

            expect(messages[1].severity).toBe('error');
            expect(messages[1].excerpt).toBe(expected1);
            expect(messages[1].url).toBe(expected1Url);
            expect(messages[1].location.file).toBe(paths.bad);
            expect(messages[1].location.position).toEqual([[0, 8], [0, 9]]);
            expect(messages[1].solutions.length).toBe(1);
            expect(messages[1].solutions[0].position).toEqual([[0, 6], [0, 9]]);
            expect(messages[1].solutions[0].replaceWith).toBe('42');
          });
        });
      });

    });


    describe('with-config', () => {
      let files = ['bad.js', 'eslint.config.js'];
      beforeAll(() => {
        for (let file of files) {
          copyFileToDir(
            Path.join(fixtureRoot, 'files', 'with-config', file),
            paths.eslintLatest
          );
        }
      });

      afterAll(() => {
        for (let file of files) {
          rimraf.sync(Path.join(paths.eslintLatest), file);
        }
      });

      describe('checks bad.js and', () => {
        let editor = null;
        beforeEach(async () => {
          editor = await atom.workspace.open(paths.bad);
          atom.project.setPaths([paths.eslintLatest]);
        });

        it('verifies the messages', async () => {
          const messages = await lint(editor);
          expect(messages.length).toBe(2);

          const expected0 = "'foo' is not defined. (no-undef)";
          const expected0Url = 'https://eslint.org/docs/latest/rules/no-undef';
          const expected1 = 'Extra semicolon. (semi)';
          const expected1Url = 'https://eslint.org/docs/latest/rules/semi';

          expect(messages[0].severity).toBe('error');
          expect(messages[0].excerpt).toBe(expected0);
          expect(messages[0].url).toBe(expected0Url);
          expect(messages[0].location.file).toBe(paths.bad);
          expect(messages[0].location.position).toEqual([[0, 0], [0, 3]]);
          expect(messages[0].solutions).not.toBeDefined();

          expect(messages[1].severity).toBe('error');
          expect(messages[1].excerpt).toBe(expected1);
          expect(messages[1].url).toBe(expected1Url);
          expect(messages[1].location.file).toBe(paths.bad);
          expect(messages[1].location.position).toEqual([[0, 8], [0, 9]]);
          expect(messages[1].solutions.length).toBe(1);
          expect(messages[1].solutions[0].position).toEqual([[0, 6], [0, 9]]);
          expect(messages[1].solutions[0].replaceWith).toBe('42');
        });
      });
    });
  });

}

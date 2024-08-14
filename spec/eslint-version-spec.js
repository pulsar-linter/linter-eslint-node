'use babel';
import { homedir } from 'os';
import * as Path from 'path';
// import * as FS from 'fs';
import {
  copyFileToDir,
  copyDirectoryWithCleanup,
  copyFileToTempDir,
  openAndSetProjectDir,
  getNotification,
  wait
} from './helpers';
import rimraf from 'rimraf';
import linterEslintNode from '../lib/main';

const packagesRoot = Path.join(root, '.pulsar', 'packages');
const fixtureRoot = Path.join(__dirname, 'fixtures');

const root = Path.normalize(homedir());
const paths = {
  eslint7: Path.join(root, 'with-eslint-7'),
  eslint8: Path.join(root, 'with-eslint-8'),
  eslintLatest: Path.join(root, 'with-eslint-latest'),
  eslintignoreDir: Path.join(fixtureRoot, 'eslintignore')
};


if (process.env.CI) {

  describe('ESLint version testing', () => {
    const linterProvider = linterEslintNode.provideLinter();
    const { lint } = linterProvider;

    describe('ESLint 8', () => {
      describe('with-config', () => {
        let cleanup;
        beforeAll(() => {
          cleanup = copyDirectoryWithCleanup(
            Path.join(fixtureRoot, 'files', 'with-config'),
            paths.eslint8
          );
        });

        afterAll(() => cleanup());

        describe('checks bad.js and', () => {
          let editor = null;
          beforeEach(async () => {
            editor = await atom.workspace.open(
              Path.join(paths.eslint8, 'with-config', 'bad.js')
            );
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

      describe('when a file is specified in an .eslintignore file', () => {
        let editor;
        let cleanup;
        let projectPath;
        beforeAll(() => {
          cleanup = copyDirectoryWithCleanup(
            Path.join(fixtureRoot, 'eslintignore'),
            paths.eslint8
          );
          projectPath = Path.join(paths.eslint8, 'eslintignore');
        });

        afterAll(() => cleanup());

        beforeEach(async () => {
          atom.config.set('linter-eslint-node.advanced.disableEslintIgnore', false);
          let ignoredFilePath = Path.join(projectPath, 'ignored.js');
          editor = await openAndSetProjectDir(ignoredFilePath, projectPath);
        });

        it('will not give warnings when linting the file', async () => {
          // By default (for reasons I haven't figured out yet) the
          // `spec/fixtures` folder is the sole project path. Our
          // what’s-our-cwd traversal logic will search upward and use the
          // first directory with an `.eslintignore`… until it hits the project
          // root. If we don't set the project root here, our `.eslintignore`
          // will itself, poignantly, be ignored.
          const messages = await lint(editor);
          expect(messages.length).toBe(0);
        });

        it('will not give warnings when autofixing the file', async () => {
          const expectedMessage = 'Nothing to fix.';
          const notificationPromise = getNotification(expectedMessage);
          await atom.commands.dispatch(
            atom.views.getView(editor),
            'linter-eslint-node:fix-file'
          );
          const notification = await notificationPromise;

          expect(notification.getMessage()).toBe(expectedMessage);
        });
      });

    });

    describe('when a file is not specified in .eslintignore file', () => {
      it('will give warnings when linting the file', async () => {
        const tempPath = await copyFileToTempDir(
          Path.join(paths.eslintignoreDir, 'ignored.js')
        );
        const tempDir = Path.dirname(tempPath);
        const editor = await atom.workspace.open(tempPath);
        atom.config.set('linter-eslint-node.advanced.disableEslintIgnore', false);
        await copyFileToDir(Path.join(paths.eslintignoreDir, '.eslintrc.yaml'), tempDir);
        const messages = await lint(editor);
        expect(messages.length).toBe(1);
        rimraf.sync(tempDir);
      });

      it('will do nothing while "enable" option is `false`, but wake if "enable" is set to `true`', async () => {
        atom.config.set('linter-eslint-node.enable', false);
        const tempPath = await copyFileToTempDir(
          Path.join(paths.eslintignoreDir, 'ignored.js')
        );
        const tempDir = Path.dirname(tempPath);
        const editor = await atom.workspace.open(tempPath);
        atom.config.set('linter-eslint-node.advanced.disableEslintIgnore', false);
        await copyFileToDir(Path.join(paths.eslintignoreDir, '.eslintrc.yaml'), tempDir);

        let messages = await lint(editor);
        expect(messages).toBeUndefined();

        atom.config.set('linter-eslint-node.enable', true);
        messages = await lint(editor);
        expect(messages.length).toBe(1);

        rimraf.sync(tempDir);
      });

    });
  });
}

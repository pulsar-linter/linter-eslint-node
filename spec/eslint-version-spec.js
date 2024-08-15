'use babel';
import { homedir } from 'os';
import * as Path from 'path';
// import * as FS from 'fs';
import {
  // copyFileToDir,
  copyDirectoryWithCleanup,
  // copyFileToTempDir,
  openAndSetProjectDir,
  // wait
} from './helpers';
import rimraf from 'rimraf';
import linterEslintNode from '../lib/main';


const root = Path.normalize(homedir());
const fixtureRoot = Path.join(__dirname, 'fixtures');
const paths = {
  eslint7: Path.join(root, 'with-eslint-7'),
  eslint8: Path.join(root, 'with-eslint-8'),
  eslintLatest: Path.join(root, 'with-eslint-latest'),
  bad: Path.join(fixtureRoot, 'files', 'with-config', 'bad.js'),
  eslintignoreDir: Path.join(fixtureRoot, 'eslint8-ignore')
};

/**
 * @param {string} expectedMessage
 * @returns {Promise<import("atom").Notification>}
 */
function getNotification(expectedMessage) {
  return new Promise((resolve, reject) => {
    /** @type {import("atom").Disposable | undefined} */
    let notificationSub;
    /**
    * @param {Promise<import("atom").Notification>} notification
    */
    const newNotification = (notification) => {
      if (notification.getMessage() !== expectedMessage) {
        // As the specs execute asynchronously, it's possible a notification
        // from a different spec was grabbed, if the message doesn't match what
        // is expected simply return and keep waiting for the next message.
        return;
      }
      // Dispose of the notification subscription
      if (notificationSub !== undefined) {
        notificationSub.dispose();
        resolve(notification);
      } else {
        reject();
      }
    };
    // Subscribe to Atom's notifications
    notificationSub = atom.notifications.onDidAddNotification(newNotification);
  });
}


if (process.env.CI) {

  describe('ESLint version testing', () => {

    beforeEach(async () => {
      atom.config.set('linter-eslint-node.enable', true);
      atom.packages.triggerDeferredActivationHooks();
      atom.packages.triggerActivationHook('core:loaded-shell-environment');

      // Activate the JavaScript language so Atom knows what the files are
      await atom.packages.activatePackage('language-javascript');
      // Activate the provider
      await atom.packages.activatePackage('linter-eslint-node');
    });

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
          let filePath = Path.join(paths.eslint8, 'with-config', 'bad.js');
          beforeEach(async () => {
            editor = await atom.workspace.open(filePath);
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
            expect(messages[0].location.file).toBe(filePath);
            expect(messages[0].location.position).toEqual([[0, 0], [0, 3]]);
            expect(messages[0].solutions).not.toBeDefined();

            expect(messages[1].severity).toBe('error');
            expect(messages[1].excerpt).toBe(expected1);
            expect(messages[1].url).toBe(expected1Url);
            expect(messages[1].location.file).toBe(filePath);
            expect(messages[1].location.position).toEqual([[0, 8], [0, 9]]);
            expect(messages[1].solutions.length).toBe(1);
            expect(messages[1].solutions[0].position).toEqual([[0, 6], [0, 9]]);
            expect(messages[1].solutions[0].replaceWith).toBe('42');
          });
        });
      });

      describe('ignores', () => {
        let cleanup;
        let projectPath;
        let editor;

        beforeAll(async () => {
          console.log('BEFORE ALL');
          cleanup = copyDirectoryWithCleanup(
            paths.eslintignoreDir,
            paths.eslint8
          );

          projectPath = Path.join(paths.eslint8, 'eslint8-ignore');
        });

        afterAll(() => {
          console.log('AFTER ALL');
          cleanup()
        });

        describe('when a file is specified in an .eslintignore file', () => {

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

        describe('when a file is not specified in .eslintignore file', () => {

          beforeAll(() => {
            rimraf.sync(Path.join(projectPath, '.eslintignore'));
          });

          it('will give warnings when linting the file', async () => {
            let ignoredFilePath = Path.join(projectPath, 'ignored.js');
            editor = await openAndSetProjectDir(ignoredFilePath, projectPath);
            atom.config.set('linter-eslint-node.advanced.disableEslintIgnore', false);
            const messages = await lint(editor);
            expect(messages.length).toBe(1);
          });

          it('will do nothing while "enable" option is `false`, but wake if "enable" is set to `true`', async () => {
            let ignoredFilePath = Path.join(projectPath, 'ignored.js');
            atom.config.set('linter-eslint-node.enable', false);
            editor = await openAndSetProjectDir(ignoredFilePath, projectPath);
            atom.config.set('linter-eslint-node.advanced.disableEslintIgnore', false);

            let messages = await lint(editor);
            expect(messages).not.toBeDefined();

            atom.config.set('linter-eslint-node.enable', true);
            messages = await lint(editor);
            expect(messages.length).toBe(1);
          });

        });

      });


    });

  });
}

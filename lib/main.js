'use babel';

import { CompositeDisposable, Range } from 'atom';
import { basename } from 'path';
import { debounce } from 'throttle-debounce';

import console from './console';
import { ensureWorker, removeProject, disposeAll, sendMessage } from './worker-manager.js';
import { UserError, handleError } from './error.js';
import { getFileInfo, clearCache } from './prerequisites/index.js';

/**
 * @param {import('./prerequisites').PrerequisiteInfo} prerequisite
 * @returns {void}
 */
function validatePrerequisite(prerequisite) {
  if (typeof prerequisite?.eslintPath !== 'string') {
    throw new UserError(
      'Could not find ESLint api file',
      'Please ensure that you have installed ESLint or have enabled global or bundled eslint in the settings'
    );
  }

  if (typeof prerequisite.nodePath !== 'string') {
    throw new UserError(
      'Could not find Node Executable',
      'Please ensure your node execuatable is accessable. Currently system (PATH), NVM, and Volta are supported'
    );
  }

  if (prerequisite.nodeSatisfies !== true) {
    throw new UserError(
      `ESLint v${prerequisite.eslintVersion} does not run on Node v${prerequisite.nodeVersion}`
    );
  }

  if (typeof prerequisite.eslintConfig !== 'string') {
    throw new UserError('Could not find ESLint config file');
  }
}

export default {
  addFixOnSave() {
    return [
      atom.workspace.observeTextEditors(
        (textEditor) => textEditor.onDidSave(
          () => {
            // We dont want to fix the files automatically
            if (atom.config.get('linter-eslint-node.fixOnSave') !== true) {
              return;
            }

            try {
              return this.fixJob(textEditor);
            } catch (error) {
              handleError(error);
            }
          }
        )
      )
    ];
  },

  trackProjectRemoval() {
    let previousProjectPaths = atom.project.getPaths();

    return [
      // Clear workers related to removed projectPaths
      atom.project.onDidChangePaths((projectPaths) => {
        for (const projectPath of previousProjectPaths) {
          if (projectPaths.includes(projectPath) === false) {
            removeProject(projectPath);
          }
        }
        previousProjectPaths = projectPaths;
      })
    ];
  },

  trackConfigChanges() {
    return [
      // Restart all workers on in ui settings changes
      atom.config.onDidChange(
        'linter-eslint-node',
        this.clearCache.bind(this)
      ),

      // Keep track of `.eslintignore` and `.eslintrc` updates.
      atom.project.onDidChangeFiles(events => {
        const paths = events
          .map(event => {
            const fileName = basename(event.path);
            const [ projectPath, relativePath ] = atom.project.relativizePath(event.path);
            const absolutePath = event.path;
            return ({ fileName, projectPath, relativePath, absolutePath });
          })
          .filter(({relativePath, fileName}) => (
            // Modules changed, reload eslint
            relativePath.includes('node_modules') ||
            // Config likely to have changed, reload
            fileName === 'package.json' ||
            fileName === '.nvmrc' ||
            fileName === 'eslint.config.js' ||
            fileName.startsWith('.eslintrc')
          ))
          .map(({ projectPath }) => projectPath)
          .filter((value, index, array) => (
            value != null &&
            array.indexOf(value) === index
          ));

        for (const projectPath of paths) {
          removeProject(projectPath);
        }
      })
    ];
  },

  async activate () {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      ...this.addFixOnSave(),
      ...this.trackProjectRemoval(),
      ...this.trackConfigChanges(),
      // Add commands to palette
      atom.commands.add('atom-text-editor', {
        'linter-eslint-node:fix-file': this.fixFileCommand.bind(this),
        'linter-eslint-node:debug': this.debugCommand.bind(this),
        'linter-eslint-node:clear-cache': this.clearCacheCommand.bind(this)
      })
    );
  },

  async deactivate () {
    this.subscriptions.dispose();
    await disposeAll();
  },

  async extractJobData(textEditor) {
    if (!atom.workspace.isTextEditor(textEditor)) {
      console.debug('!isTextEditor');
      return { };
    }

    let projectPath;
    let content;
    let prerequisite;
    let config;
    try {
      content = {
        filePath: textEditor.getPath(),
        fileText: textEditor.getText(),
        isModified: textEditor.isModified()
      };

      [ projectPath ] = atom.project.relativizePath(content.filePath);

      config = atom.config.get('linter-eslint-node');

      prerequisite = await getFileInfo(content.filePath, projectPath, config);

    } catch (error) {
      console.warn(error);
    }

    return {
      projectPath,
      content,
      prerequisite,
      config
    };
  },

  clearCache: debounce(
    100,
    () => {
      console.debug('Clear cache');

      // Clear node resolution cache first.
      clearCache();

      // Second remove all the workers
      disposeAll();
    }
  ),

  async fixFileCommand() {
    try {
      const fixApplied = await this.fixJob(
        atom.workspace.getActiveTextEditor()
      );

      atom.notifications.addSuccess(
        fixApplied ? 'Fixes applied' : 'No fixes applied'
      );
    } catch (error) {
      handleError(error);
    }
  },

  async debugCommand() {
    // linter-eslint-node information
    const linterPath = atom.packages
      .resolvePackagePath('linter-eslint-node');
    const linterVersion = atom.packages
      .getActivePackage('linter-eslint-node')
      .metadata.version;
    const linterConfig = atom.config.get('linter-eslint-node');

    // Current editor debug information
    const textEditor = atom.workspace.getActiveTextEditor();
    const filePath = textEditor.getPath();
    const scopes = textEditor
      .getLastCursor()
      .getScopeDescriptor()
      .getScopesArray();

    const {
      projectPath,
      prerequisite
    } = await this.extractJobData(textEditor);

    const message = JSON.stringify({
      linter: {
        path: linterPath,
        version: linterVersion,
        config: linterConfig
      },
      editor: {
        path: filePath,
        scopes: scopes,
        project: projectPath
      },
      worker: prerequisite
    }, null, 2);

    atom.notifications.addInfo(
      'linter-eslint-node debug information',
      {
        detail: message,
        dismissable: true,
        buttons: [
          {
            text: 'Copy',
            onDidClick () {
              atom.clipboard.write(message);
            }
          }
        ]
      }
    );
  },

  async clearCacheCommand() {
    this.clearCache();

    atom.notifications.addInfo(
      'linter-eslint-node cache cleared'
    );
  },

  /**
   * @param {import('atom').TextEditor} textEditor
   */
  async lintJob(textEditor) {
    console.info('Linting', textEditor.getPath());

    const {
      projectPath,
      content,
      prerequisite,
      config
    } = await this.extractJobData(textEditor);

    if (
      typeof content.filePath !== 'string' ||
      typeof projectPath !== 'string'
    ) {
      console.debug({ content, projectPath });
      return [];
    }

    if (prerequisite.eslintConfig == null) {
      return;
    }

    validatePrerequisite(prerequisite);
    const worker = await ensureWorker(projectPath, prerequisite);

    const response = await sendMessage(worker, {
      type: 'lint',
      content,
      prerequisite,
      config
    });

    if (
      // Text changed since linting started
      content.fileText !== textEditor.getText() ||

      // Unprocessable results
      response?.results instanceof Array === false
    ) {
      return null;
    }

    const textBuffer = textEditor.getBuffer();

    return response
      .results
      .map(result => {
        /** @type {import('./types.js').LintMessage} */
        const message = {
          location: result.location,
          url: result.url,
          excerpt: result.excerpt,
          severity: result.severity,
          description: result.description
        };

        if (result.fix) {
          // TODO: Support eslint suggestions
          // lintResults.#.messages.#.suggestions
          // interface LintSuggestion {
          //     desc: string;
          //     fix: Rule.Fix;
          //     messageId?: string | undefined;
          // }

          message.solutions = [ {
            position: new Range(
              textBuffer.positionForCharacterIndex(result.fix.range[0]),
              textBuffer.positionForCharacterIndex(result.fix.range[1])
            ),
            replaceWith: result.fix.text
          } ];
        }

        return message;
      })
      .filter(Boolean);
  },

  /**
   * @param {import('atom').TextEditor} textEditor The textEditor to fix
   */
  async fixJob(textEditor) {
    if (atom.config.get('linter.disabledProviders').includes('ESLint (Node)')) {
      return false;
    }

    console.info('Fixing', textEditor.getPath());

    const allowedScopes = atom.config.get('linter-eslint-node.scopes');
    const isValidScope = textEditor
      .getCursors()
      .some(
        cursor => cursor
          .getScopeDescriptor()
          .getScopesArray()
          .some(scope => allowedScopes.includes(scope))
      );

    if (isValidScope === false) {
      return false;
    }

    if (textEditor.isModified()) {
      atom.notifications.addWarning(
        'linter-eslint-node: Please save before fixing.'
      );

      return false;
    }

    const {
      projectPath,
      content,
      prerequisite,
      config
    } = await this.extractJobData(textEditor);

    if (
      typeof content.filePath !== 'string' ||
      typeof projectPath !== 'string' ||
      content.fileText.length === 0
    ) {
      return false;
    }

    if (prerequisite.eslintConfig == null) {
      return false;
    }

    validatePrerequisite(prerequisite);
    const worker = await ensureWorker(projectPath, prerequisite);

    const response = await sendMessage(worker, {
      type: 'fix',
      content,
      prerequisite,
      config
    });

    if (
      // Text changed since linting started
      content.fileText !== textEditor.getText() ||

      // Unprocessable results
      response?.results instanceof Array === false
    ) {
      return false;
    }

    return response.fixApplied;
  },

  provideLinter () {
    return {
      name: 'ESLint (Node)',
      scope: 'file',
      lintsOnChange: true,
      grammarScopes: atom.config.get('linter-eslint-node.scopes'),
      lint: async (textEditor) => {
        try {
          return await this.lintJob(textEditor);
        } catch (error) {
          handleError(error);
        }
      }
    };
  }
};

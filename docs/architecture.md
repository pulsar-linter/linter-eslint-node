This is currently copied directly from https://github.com/AtomLinter/linter-eslint-node/issues/1

I’m opening this issue to summarize the major changes between `linter-eslint` and this package, and to decide what else is worth changing.

Some of the changes are necessary because of the new architecture; some of them are just opportunities to shed support for legacy stuff. I feel like there’s a better sense of project hygiene these days, such that someone who is using a very recent version of ESLint probably doesn’t need some of the oddball config options that `linter-eslint` offered.

But then my use cases for `linter-eslint` were pretty bog-standard, so I’ll have to lean on others’ experiences here.

(Before reading below, make sure you’ve read the README and understand why this package exists distinct from `linter-eslint`.)

## Architectural changes

I began with @scagood's work [in this gist](https://gist.github.com/scagood/061ebc869de679abc1324ab184cdd4a0), then made changes as follows:

* Worker script runs in the user’s own version of Node. The README specifies the several ways that this can be set. Out of the box this is just `node`, and in simple cases (no NVM, `node` installed in common places) will probably do the right thing without further configuration.

* Main package and worker pass messages back-and-forth over stdout/stdin. Both use [ndjson](https://www.npmjs.com/package/ndjson) to properly chunk messages instead of relying on @scagood’s `jsonChunks` helper — which worked surprisingly well for how terse it is, but failed sometimes when especially large JSON payloads were being sent. A few dependencies, but this is a pure JS package and feels safe to use in an arbitrary Node environment. If it isn’t, we can figure out what to replace it with.

* With newline-delimited JSON, `PromiseQueue` is no longer needed as a way of enforcing one-JSON-chunk-at-a-time behavior. I switched to the system `linter-eslint` uses: give each job a random ten-character hex string as a unique identifier.

* All configuration lookups now go through `Config` instead of `atom.config.get`. `Config` is what handles the layering of `.linter-eslint` files atop `atom.config.get` so that package options can be specified either way. `Config` has its own `get` method for lookups and an `onDidChangeConfig` method for subscribing to changes.

* The `NodePathTester` object is what handles the sanity-checking of a value that the user gives us for `nodeBin`. The goal is to check the value whenever `nodeBin` changes just to guard against typos and whatnot. If `$nodeBin --version` is successful, we assume it’s a valid Node; if not, we show a message to the user so they can correct it.

  I was worried that the value of `nodeBin` that this package sees could change at least once _during startup_ as “patches” are overlaid on the core config — first by [project-config](https://atom.io/packages/project-config) or [atomic-management](https://atom.io/packages/atomic-management) (if one is installed), then by our own application of `.linter-eslint` as a project-specific override.

  But `Config.initialize`, our first action upon activation, happens synchronously, so anything present in `.linter-eslint` will be available from the get-go. Also, I imagine the late activation hook (`core:loaded-shell-environment`) saves us from any other startup turmoil.

* I haven’t tested any of this on Windows yet. I have a Windows machine I could try it on, but I haven’t ever had occasion to set up a Node environment in Windows, so someone who’s well-versed in that would probably be better at identifying areas of improvement there.

* You’ll see a lot of `console.log` and its siblings in here. The module exported by `console.js` shadows the default `console` methods and will skip actual logging unless the package is run in dev mode. I’m not saying that all those statements will stay in for a release, but the logging has been quite helpful in this pre-v1 phase as I’ve moved large parts of this thing around, so I’m in no hurry to take it out.

## Things I’ve done so far

* Integrate new information into the “Debug” command
  * The expanded path to the version of `node` we’re using
  * The version of node we’re using
  * Which linter (linter-eslint or linter-eslint-node or neither) would handle the linting in this project (see below)
  
* Detect incompatible versions of ESLint
  * Logic: If the worker detects an ESLint version < 7.0.0, we’ll show a warning message once per session _if_ linter-eslint is not installed. This message can be disabled in the settings.
  * The warning message includes an “Install linter-eslint” button; ideally this would happen with the same workflow as `atom-package-deps`, but there’s no provision for “optional” dependencies that I can tell, and no way to “borrow” its UI for my use case. So the button just opens up https://atom.io/packages/linter-eslint in the user’s browser.
  
* Defer to linter-eslint _if present_ for v7.x ESLint
  * Both versions can theoretically lint with ESLint v7. If both are present, linter-eslint-node will let linter-eslint handle v7 projects. If only linter-eslint-node is present, it will handle v7 projects.
  
## Things I haven’t done yet and am not certain are worth doing

* Fall back to package’s own version of ESLint?
  * This is a fine idea and something linter-eslint does, so I’m sure this will happen, but I’m fuzzy on the details. By default, linter-eslint wouldn’t lint unless an `.eslintrc` is found, so how common is it for someone to have an `.eslintrc` defined but no local ESLint module?

* Integrate `consistent-path`?
  * The current package relies on [consistent-path](https://github.com/steelbrain/consistent-path) as a heuristic for finding the global ESLint install. We could use it to help find Node itself if the user hasn’t specified `nodeBin`, but the package is read-only and hasn’t been touched in six years.

    For users who _have_ told us exactly where their Node is, we’d be unnecessarily starting a shell session, including evaluating anything in their `.bashrc` or `.zshrc` or whatever.

    For those who haven’t, it feels like a lot of work to do to guess a value they could honestly just tell us.

    I haven’t decided if it’s better to have a robust heuristic here, or if it just complicates our “simply tell us where your Node is” guidance.

## Tests

I wanted to pin down the architecture before porting over the specs, but I swear that’s on my agenda.

## Options I’ve migrated

* Fix on save
* Disable when no .eslintrc

* Ignore certain rules while typing
  * Logic: if the document is dirty, the worker will filter out any violations whose rule ID is present here

* Ignore fixable rules while typing
  * Logic: if the document is dirty, the worker will filter out any violations with a `fix` property

* Disable certain rules from auto-fixing
  * Easy enough by passing a function to the `ESLint` construtor (`fix: () => {}`)

## Options I’ve added

* Path to Node binary (the big important one)

* Warn about old ESLint versions
  * When enabled, shows a message once per session when this package can’t use the included ESLint

## Options I think should be removed

* Use global ESLint — bring-your-own-node means that the worker script ought to handle this properly, I hope? (check workingDir algorithm)

* Global node path: again, presence of `nodeBin` makes this unnecessary

## Options I’m on the fence about

* Lint HTML files
  * The core logic is there (if enabled, an extra scope goes into the “scopes” setting) but I haven’t tested if this works. Feel like this could be rolled into the `scopes` setting.

* Use custom .eslintrc path
  * No obvious way I see to tell `ESLint` class to look in a different location for `.eslintrc`, so I think we’d have to read in this path and bundle it into the options passed into the `ESLint` constructor. Plus be sure to clear the cache when this file changes. This would be a lot of work for an obscure use case.

* Disable caching — so far I’ve not had a need to micromanage caching the way that `linter-eslint` has. Maybe this could control whether we cache `ESLint` instances in the worker script at all?

* Local `node_modules` path — I’ve got a code path for this, but haven’t tested it yet. In theory, this will work; but, again, is this a common use case?

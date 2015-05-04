# JIRA Helper

There is a JIRA helper to view charts.

### Setup

1. Install [Node.js](http://nodejs.org/download/), if you don't have it yet.

2. Install global dependencies:

    ```
    npm install grunt-cli -g
    ```

    ```
    npm install bower -g
    ```

3. Install local dependencies:

    ```
    npm install
    ```

4. Initialize dependencies:
    
    ```
    grunt install
    ```

### Build

**Building in a local environment:**

```
grunt build
```

### Watch

**Watch and build for any changes:**

```
grunt run
```

### Test

**Run unit tests:**

```
grunt test
```

### Running in a local environment

## Structure

The basic structure of the product is given in the following way:

* `app/` Contains the source code of the JIRA Helper.
* `bower_components/` Contains all dependencies fetched via [Bower](http://bower.io/). However, this directory is unnecessary for versioning, so it is ignored.
* `dist/` Contains JIRA Helper generated files, once build task has been run. However, this directory is unnecessary for versioning, so it is ignored.
* `node_modules/` Contains all dependencies fetched via [Node Packaged Modules](https://www.npmjs.org/). However, this directory is unnecessary for versioning, so it is ignored.
* `.bowerrc` [Bower](http://bower.io/) is configured using this file.
* `.editorconfig` Specifies the coding style for different editors/IDEs.
* `.gitignore` A gitignore file specifies intentionally untracked files that Git should ignore.
* `.jsbeautifyrc` Specifies the coding format rules for [JSBeautify](http://jsbeautifier.org/).
* `.jshintrc` Specifies the linting configurations for [JSHint](http://www.jshint.com/).
* `bower.json` Lists all [Bower](http://bower.io/) dependencies.
* `Gruntfile.js` Used to configure or define tasks and load [Grunt](http://gruntjs.com/) plugins.
* `package.json` Lists all [Node.js](http://nodejs.org/) dependencies.
* `README.md` Explains the JIRA Helper product.

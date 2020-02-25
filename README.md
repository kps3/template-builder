# Template Builder

## Usage

### Folder Structure

    .
    ├── ...
    ├── templates
    │   ├── components               # Components/partials used within the templates
    │   |   ├── header.hbs
    │   ├── layouts                  # Layouts (must use `{{{yield}}}` to output template body)
    │   |   ├── default.hbs
    │   └── index.hbs                # Templates
    └── ...

### Code

```javascript
const templateCompiler = require('@kps3/hbs-template-builder');

templateBuilder({
  path: './templates',         // relative path to template directory
  layout: 'default.hbs',       // layout file name
  output: './dist',            // relative path to output build directory
  watch: false,                // watch files for changes
  buildComponents: false       // build component files like templates (useful for testing components)
});
```

### CLI

```bash
$ hbs-template-builder --path=./templates --layout=default.hbs --output=./dist --buildComponents --watch
```

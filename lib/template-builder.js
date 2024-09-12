const path = require('path');
const fs = require('fs');
const glob = require('glob');
const nsfw = require('nsfw');
const Handlebars = require('handlebars');
const repeatHelper = require('handlebars-helper-repeat');
const yamlFront = require('yaml-front-matter');

const LAYOUT_PATH = 'layouts';
const COMPONENTS_PATH = 'components';
const FILE_PATTERN = '*.hbs';
const BUILD_FILE_PATTERN = '{components/,}*.html';

const state = {
  watcher: null,
  registeredComponents: []
};

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
     [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

Handlebars.registerHelper('repeat', repeatHelper);

Handlebars.registerHelper('equals', (arg1, arg2, options) => {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('contains', (needle, haystack, options) => {
  const escapedNeedle = Handlebars.escapeExpression(needle);
  const escapedHaystack = Handlebars.escapeExpression(haystack);
  return (escapedHaystack.indexOf(escapedNeedle) > -1)
    ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('text', (length) => {
  const string = 'Fusce eget auctor elit, nec auctor nibh. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Cras auctor varius volutpat. Phasellus tempor felis ligula, ut euismod metus varius non. Suspendisse neque massa, porttitor non condimentum eget, pulvinar ac libero. Vivamus in congue mauris. Proin eget sapien id ipsum dictum rhoncus ut consequat libero. Aliquam lacus velit, viverra in ultrices vitae, euismod eget sem. Curabitur quis ultrices risus, sit amet interdum nulla. Vestibulum tincidunt mi nunc, aliquam tempus tortor convallis ac. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Phasellus suscipit tempor ligula, nec scelerisque lacus finibus ai. Duis a porta massa, vel semper mi. Aenean in pharetra turpis. Fusce id malesuada libero. Integer cursus arcu vel odio efficitur sagittis.'
  const sentences = shuffle(string.split('. '));
  const stop = typeof length === 'object' ? 1 : length;
  const requested = sentences.splice(0, stop);
  return requested.join('. ');
});

Handlebars.registerHelper('image', (options) => {
  const args = options.hash;
  const size = args.size;

  if (!args.size) {
    throw new Error(`Please add a size to this image. ex. "250x300"`);
  }
  return `https://via.placeholder.com/${size}`;
});

Handlebars.registerHelper('raw', (options) => {
  return options.fn();
});

const parseTemplate = (file) => {
  const fileData = fs.readFileSync(file, 'utf-8');
  if (!fileData) return { template: '', data: {} };

  const {
    __content: template,
    ...data
  } = yamlFront.loadFront(fileData);

  return {
    template,
    data
  };
};

const getHandlebarsTemplate = (file) => {
  const data = fs.readFileSync(file, 'utf-8');
  if (!data) return '';

  return Handlebars.compile(data);
};

const registerComponents = (componentFiles) => {
  state.registeredComponents.forEach((componentName) => {
    Handlebars.unregisterPartial(componentName);
  });
  state.registeredComponents = [];

  componentFiles.forEach((componentFile) => {
    const ext = path.extname(componentFile);
    const componentName = path.basename(componentFile, ext);
    const componentData = fs.readFileSync(componentFile, 'utf-8');

    Handlebars.registerPartial(componentName, componentData);
    state.registeredComponents.push(componentName)
  });
};

const buildTemplate = (templateFile, layout, outputPath) => {
  const ext = path.extname(templateFile);
  const templateName = path.basename(templateFile, ext);
  const outputFilePath = path.resolve(outputPath, `${templateName}.html`);
  const {
    template,
    data
  } = parseTemplate(templateFile);
  const compiledTemplate = Handlebars.compile(template);

  const compiled =  layout({
    yield: compiledTemplate(data)
  });

  fs.writeFile(outputFilePath, compiled, () => {
    console.log(`Updated template: ${templateName}${ext}`);
  });
};

const cleanTemplates = (basePath, outputPath) => {
  const buildFilePattern = path.resolve(basePath, outputPath, BUILD_FILE_PATTERN);
  const buildFiles = glob.sync(buildFilePattern);

  buildFiles.forEach(fs.unlinkSync);
};

const createComponentDir = (outputPath) => {
  const directoryPath = path.resolve(outputPath, COMPONENTS_PATH);
  if (!fs.existsSync(directoryPath)){
    fs.mkdirSync(directoryPath);
  }
};

const createBuildDir = (outputPath) => {
  const directoryPath = path.resolve(outputPath);
  if (!fs.existsSync(directoryPath)){
    fs.mkdirSync(directoryPath);
  }
};

const buildTemplates = ({
  layout,
  watch = false,
  buildComponents = false,
  path: basePath,
  output: outputPath,
}) => {
  const templateFilePattern = path.resolve(basePath, FILE_PATTERN);
  const componentFilePattern = path.resolve(basePath, COMPONENTS_PATH, FILE_PATTERN);
  const layoutFile = path.resolve(basePath, LAYOUT_PATH, layout);
  const componentOutputPath = path.resolve(outputPath, COMPONENTS_PATH);

  createBuildDir(outputPath);

  if (buildComponents) {
    createComponentDir(outputPath);
  }

  const buildTemplateItems = () => {
    const layoutTemplate = getHandlebarsTemplate(layoutFile);
    const templateFiles = glob.sync(templateFilePattern);
    const componentFiles = glob.sync(componentFilePattern);

    cleanTemplates(basePath, outputPath);
    registerComponents(componentFiles);

    try {
      templateFiles.forEach(
        templateFile => buildTemplate(templateFile, layoutTemplate, outputPath)
      );

      if (buildComponents) {
        componentFiles.forEach(
          componentFile => buildTemplate(
            componentFile,
            layoutTemplate,
            componentOutputPath,
            { isComponent: true }
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (watch) {
    nsfw(
      basePath,
      buildTemplateItems
    )
      .then((watcher) => {
        state.watcher = watcher;
        return watcher.start();
      });
  }

  buildTemplateItems();
};

process.on('exit', () => {
  if (state.watcher !== null) {
    state.watcher.stop();
  }
});

process.on('SIGINT', () => {
  process.exit(2);
});

module.exports = buildTemplates;

const fs = require('fs');
const path = require('path');
const LZString = require('lz-string');
const normalizePath = require('normalize-path');
const map = require('unist-util-map');
const queryString = require('query-string');

const DEFAULT_PROTOCOL = 'embedded-codesandbox://';
const DEFAULT_EMBED_OPTIONS = {
  view: 'preview',
  hidenavigation: 1,
};
const DEFAULT_GET_IFRAME = url =>
  `<iframe src="${url}" class="embedded-codesandbox" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>`;

// Matches compression used in Babel and CodeSandbox REPLs
// https://github.com/babel/website/blob/master/js/repl/UriUtils.js
const compress = string =>
  LZString.compressToBase64(string)
    .replace(/\+/g, `-`) // Convert '+' to '-'
    .replace(/\//g, `_`) // Convert '/' to '_'
    .replace(/=+$/, ``); // Remove ending '='

module.exports = (
  { markdownAST },
  {
    directory,
    protocol = DEFAULT_PROTOCOL,
    embedOptions = DEFAULT_EMBED_OPTIONS,
    getIframe = DEFAULT_GET_IFRAME,
  }
) => {
  if (!directory) {
    throw Error('Required option "directory" not specified');
  } else if (!fs.existsSync(directory)) {
    throw Error(`Cannot find directory "${directory}"`);
  } else if (!directory.endsWith('/')) {
    directory += '/';
  }

  const getDirectoryPath = url => {
    let directoryPath = url.replace(protocol, '');
    const fullPath = path.join(directory, directoryPath);
    return normalizePath(fullPath);
  };

  const getFilesList = directory => {
    const files = fs.readdirSync(directory);
    return files.map(file => {
      const fullFilePath = path.resolve(directory, file);
      const content = fs.readFileSync(fullFilePath, 'utf-8');
      return {
        name: file,
        content,
      };
    });
  };

  const createParams = files => {
    const filesObj = files.reduce((prev, current) => {
      // parse package.json first
      if (current.name === 'package.json') {
        prev[current.name] = { content: JSON.parse(current.content) };
      } else {
        prev[current.name] = { content: current.content };
      }
      return prev;
    }, {});
    const params = {
      files: filesObj,
    };

    return compress(JSON.stringify(params));
  };

  const convertNodeToEmbedded = (node, params) => {
    delete node.children;
    delete node.position;
    delete node.title;
    delete node.url;

    const encodedEmbedOptions = encodeURIComponent(
      queryString.stringify(embedOptions)
    );
    const sandboxUrl = `https://codesandbox.io/api/v1/sandboxes/define?embed=1&parameters=${params}&query=${encodedEmbedOptions}`;
    const embedded = getIframe(sandboxUrl);

    node.type = 'html';
    node.value = embedded;
  };

  map(markdownAST, (node, index, parent) => {
    if (node.type === 'link' && node.url.startsWith(protocol)) {
      const dir = getDirectoryPath(node.url);
      const files = getFilesList(dir);
      const params = createParams(files);
      convertNodeToEmbedded(node, params);
    }

    return node;
  });

  return markdownAST;
};

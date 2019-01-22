jest.mock(`fs`, () => {
  return {
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    lstatSync: jest.fn(),
  };
});

const fs = require(`fs`);
const Remark = require(`remark`);
const plugin = require(`../index`);
const queryString = require('query-string');
const LZString = require('lz-string');

const remark = new Remark();

const getNodeContent = node => node.children[0].children[0];

const decompress = string =>
  LZString.decompressFromBase64(
    string
      .replace(/-/g, '+') // Convert '-' to '+'
      .replace(/_/g, '/') // Convert '_' to '/'
  );

describe('gatsby-remark-embedded-codesandbox', () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    fs.readdirSync.mockReset();
    fs.readFileSync.mockReset();
    fs.lstatSync.mockReset();

    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['index.html', 'index.js', 'package.json']);
    fs.readFileSync
      .mockReturnValueOnce('<html><body></body></html>')
      .mockReturnValueOnce('const foo = "bar";')
      .mockReturnValueOnce('{ "name": "example" }');
    fs.lstatSync.mockReturnValue({
      isDirectory: function() {
        return false;
      },
    });
  });

  it(`generates an embedded sandbox for the specified example folder`, async () => {
    const markdownAST = remark.parse(`[](embedded-codesandbox://example)`);
    const transformed = plugin({ markdownAST }, { directory: `examples` });
    expect(getNodeContent(transformed)).toMatchSnapshot();
  });

  it(`generates an embedded sandbox for a nested example folder`, async () => {
    const markdownAST = remark.parse(
      `[](embedded-codesandbox://path/to/folder)`
    );
    const transformed = plugin({ markdownAST }, { directory: `examples` });
    expect(fs.readdirSync).toHaveBeenCalledWith('examples/path/to/folder');
    expect(getNodeContent(transformed)).toMatchSnapshot();
  });

  it('generates an embedded sandbox using a custom protocol', async () => {
    const markdownAST = remark.parse(`[](custom-embedded-protocol://example)`);
    const transformed = plugin(
      { markdownAST },
      { directory: 'examples', protocol: 'custom-embedded-protocol://' }
    );
    expect(getNodeContent(transformed)).toMatchSnapshot();
  });

  it('generates an embedded sandbox using custom embedding options', async () => {
    const markdownAST = remark.parse(`[](embedded-codesandbox://example)`);
    const transformed = plugin(
      { markdownAST },
      {
        directory: 'examples',
        embedOptions: {
          view: 'split',
          hidenavigation: 0,
        },
      }
    );
    expect(getNodeContent(transformed).value).toEqual(
      expect.stringContaining('query=hidenavigation%3D0%26view%3Dsplit')
    );
  });

  it('generates an embedded sandbox using a custom getIframe function', async () => {
    const markdownAST = remark.parse(`[](embedded-codesandbox://example)`);
    const transformed = plugin(
      { markdownAST },
      {
        directory: 'examples',
        getIframe: url => `<iframe src="${url}" />`,
      }
    );
    expect(getNodeContent(transformed)).toMatchSnapshot();
  });

  it('generates an embedded sandbox using the overridable url-query options', () => {
    const markdownAST = remark.parse(
      `[](embedded-codesandbox://example?view=split&hidenavigation=0)`
    );
    const transformed = plugin({ markdownAST }, { directory: 'examples' });
    expect(getNodeContent(transformed).value).toEqual(
      expect.stringContaining('query=hidenavigation%3D0%26view%3Dsplit')
    );
  });

  it('overrides url-query options correctly', () => {
    const markdownAST = remark.parse(
      `[](embedded-codesandbox://example?hidenavigation=0&foo=bar)`
    );
    const transformed = plugin({ markdownAST }, { directory: 'examples' });
    expect(getNodeContent(transformed).value).toEqual(
      expect.stringContaining('foo%3Dbar%26hidenavigation%3D0%26view%3Dpreview')
    );
  });

  it('looks for package.json files in parent folder is none is found', () => {
    // first time is called to list files
    fs.readdirSync.mockReturnValueOnce(['index.html', 'index.js']);
    // from second call it's looking for package.json
    fs.readdirSync.mockReturnValueOnce(['index.html', 'index.js']);
    fs.readdirSync.mockReturnValueOnce([]);
    fs.readdirSync.mockReturnValueOnce(['package.json']);
    fs.readFileSync
      .mockReturnValueOnce('<html><body></body></html>')
      .mockReturnValueOnce('const foo = "bar";')
      .mockReturnValueOnce('{ "name": "example" }');
    const markdownAST = remark.parse(
      `[](embedded-codesandbox://coolstuff/first?hidenavigation=0&foo=bar)`
    );
    const transformed = plugin({ markdownAST }, { directory: 'examples' });
    expect(fs.readdirSync).toHaveBeenNthCalledWith(
      2,
      'examples/coolstuff/first'
    );
    expect(fs.readdirSync).toHaveBeenNthCalledWith(3, 'examples/coolstuff');
    expect(fs.readdirSync).toHaveBeenNthCalledWith(4, 'examples');
  });

  it('uses a fallback value as package.json if nothing is found in folders', () => {
    // first time is called to list files
    fs.readdirSync.mockReturnValueOnce(['index.html', 'index.js']);
    // from second call it's looking for package.json
    fs.readdirSync.mockReturnValueOnce(['index.html', 'index.js']);
    fs.readdirSync.mockReturnValueOnce([]);
    fs.readdirSync.mockReturnValueOnce([]);
    fs.readFileSync
      .mockReturnValueOnce('<html><body></body></html>')
      .mockReturnValueOnce('const foo = "bar";');
    const markdownAST = remark.parse(
      `[](embedded-codesandbox://coolstuff/first?hidenavigation=0&foo=bar)`
    );
    const transformed = plugin(
      { markdownAST },
      { directory: 'examples', getIframe: url => url }
    );
    const value = getNodeContent(transformed).value;
    const query = queryString.parse(value.split('?')[1]);
    expect(decompress(query.parameters)).toMatchSnapshot();
  });
});

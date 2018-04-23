jest.mock(`fs`, () => {
  return {
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

const fs = require(`fs`);
const Remark = require(`remark`);
const plugin = require(`../index`);

const remark = new Remark();

const getNodeContent = node => node.children[0].children[0];

describe('gatsby-remark-embedded-codesandbox', () => {
  beforeEach(() => {
    fs.existsSync.mockReset();
    fs.readdirSync.mockReset();
    fs.readFileSync.mockReset();

    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['package.json', 'index.html', 'index.js']);
    fs.readFileSync
      .mockReturnValueOnce('{ "name": "example" }')
      .mockReturnValueOnce('<html><body></body></html>')
      .mockReturnValueOnce('const foo = "bar";');
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
});

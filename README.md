# gatsby-remark-embedded-codesandbox

[![NPM badge](https://img.shields.io/npm/v/gatsby-remark-embedded-codesandbox.svg?style=flat-square)](https://www.npmjs.com/package/gatsby-remark-embedded-codesandbox)
[![Travis badge](https://img.shields.io/travis/elboman/gatsby-remark-embedded-codesandbox.svg?branch=master&style=flat-square)](https://travis-ci.org/elboman/gatsby-remark-embedded-codesandbox)

This plugin adds support for generting embedded [Codesandbox](https://codesandbox.io/), specifying a folder in local files to populate the contents of it.
This enables example code to be stored along side of, and revisioned with, your website content.

This plugin is based on [gatsby-remark-code-repls](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-remark-code-repls).

## Getting started

To embed a Codesandbox editor in you markdown/remark content, simply add a link with the custom protocol pointing to the folder desired folder:

```md
[embedded example](embedded-codesandbox://example/folder)
```

It will scan the folder and generate the proper html to include the editor.

## Overview

For example, given the following project directory structure:

```
examples/
├── hello-world-example
│   ├── package.json
│   ├── index.html
│   └── index.js
├── some-other-example
│   ├── package.json
│   └── index.js
```

These example files can be referenced via links in markdown that get transformed
to embedded editors. For example:

```md
<!-- before -->

[hello world example](embedded-codesandbox://hello-world-example)

<!-- after -->

<iframe src="https://codesandbox.io/api/v1/sandboxes/define?embed=1&parameters=N4IgZglgNgpgziAXKADgQwMYGs0HMYB0AVnAPYB2SoGFALjObVSOWgLYxIgwAe7KsEAF8hAGhARyAE14EAFrTZRmNRgyaIQAHgVKAfFoBGpKQE8DAemNnLuqHuHjJMnsQTIQq-oy6q4tAAIwUlIAgF4AgB0QQzQAJ2iAbmERIA&query=hidenavigation%3D1%26view%3Dpreview" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;\\" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>
```

> NB: Codesandbox [**requires** a `package.json` file](https://codesandbox.io/docs/importing#how-it-works) in order to work!
> You can define dependencies such as `react` that will be included in the sandbox.
> If you don't need any just add the minimum required:
>
> ```json
> {
>   "name": "example",
>   "dependencies": {}
> }
> ```

### How does it work?

CodeSandbox uses the [same URL compression schema used by the Babel REPL](https://github.com/babel/website/blob/c9dd1f516985f7267eb58c286789e0c66bc0a21d/js/repl/UriUtils.js#L22-L26) to embed the local code example in a URL.

This is than passed to the (awesome) [define api](https://codesandbox.io/docs/importing#define-api) to generate a sandbox on the fly.

## Installation

`yarn add gatsby-remark-embedded-codesandbox`

## Usage

```javascript
// In your gatsby-config.js
{
  resolve: 'gatsby-transformer-remark',
  options: {
    plugins: [
      {
        resolve: 'gastby-remark-embedded-codesandbox',
        options: {
          // Required:

          // Example code folders are relative to this dir.
          // eg src/_examples/some-example-folder
          directory: `${__dirname}/src/_examples/`,

          // Optional:

          // Custom protocol for parsing the embedding link
          // default:
          protocol: 'embedded-codesandbox://',

          // Customise Codesandbox embedding options:
          // https://codesandbox.io/docs/embedding#embed-options
          // default:
          embedOptions: {
            view: 'preview',
            hidenavigation: 1,
          },

          // Customise the embedding iframe given the generated url
          // default:
          getIframe: url => `<iframe src="${url}" class="embedded-codesandbox" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>`
        }
      }
    ]
  }
}
```

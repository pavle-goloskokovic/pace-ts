This is a TypeScript port of now deprecated [pace](https://github.com/HubSpot/pace) project.

Source code has been rewritten in TypeScript and Grunt has been replaced with webpack to produce a slightly more optimized production build and type declarations for TypeScript users.

pace-ts
=======

An automatic web page progress bar.

Include `pace.js` and a theme of your choice to your page and you are done!

Pace will automatically monitor your Ajax requests, event loop lag, document ready state and elements on your page to decide on the progress.

If you use AMD or Browserify, require `pace.js` and call `pace.start()` as early in the loading process as is possible.

### [Demo](http://github.hubspot.com/pace/docs/welcome/)

### [Documentation](http://github.hubspot.com/pace/)

### Example

```html
<head>
  <script src="/pace/pace.js"></script>
  <link href="/pace/themes/pace-theme-barber-shop.css" rel="stylesheet" />
</head>
```

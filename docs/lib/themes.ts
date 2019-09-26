/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Color, vm;
if (typeof module !== 'undefined' && module !== null)
{
    vm = require('vm');

    // Used by the eval'd code
    Color = require('color');
}

const loadTheme = (name, cb) => $.ajax({
    url: `/pace/templates/pace-theme-${ name }.tmpl.css`,
    success: cb
});

const compileTheme = function (body, args)
{
    if (args == null) { args = {}; }
    return body.replace(/`([\s\S]*?)`/gm, function (match, code)
    {
        let val;
        if (typeof module !== 'undefined' && module !== null)
        {
            val = vm.runInNewContext(code, {args, Color});
        }
        else
        {
            // It matters that args is in the context
            ({
                Color
            } = window);
            val = eval(code);
        }

        return val;
    });
};

if (typeof module !== 'undefined' && module !== null)
{
    module.exports = {compileTheme};
}
else
{
    window.loadTheme = loadTheme;
    window.compileTheme = compileTheme;
}

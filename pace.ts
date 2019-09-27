/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS203: Remove `|| {}` from converted for-own loops
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
*/
import Evented from './src/ts/Evented';
import XMLHttpRequestIntercepted from './src/ts/XMLHttpRequestIntercepted';
import WebSocketIntercepted from './src/ts/WebSocketIntercepted';
import requestIntercept from './src/ts/RequestIntercept';

let init, source;

const defaultOptions: {[index: string]: any} = {
    // How long should it take for the bar to animate to a new
    // point after receiving it
    catchupTime: 100,

    // How quickly should the bar be moving before it has any progress
    // info from a new source in %/ms
    initialRate: .03,

    // What is the minimum amount of time the bar should be on the
    // screen.  Irrespective of this number, the bar will always be on screen for
    // 33 * (100 / maxProgressPerFrame) + ghostTime ms.
    minTime: 250,

    // What is the minimum amount of time the bar should sit after the last
    // update before disappearing
    ghostTime: 100,

    // Its easy for a bunch of the bar to be eaten in the first few frames
    // before we know how much there is to load.  This limits how much of
    // the bar can be used per frame
    maxProgressPerFrame: 20,

    // This tweaks the animation easing
    easeFactor: 1.25,

    // Should pace automatically start when the page is loaded, or should it wait for `start` to
    // be called?  Always false if pace is loaded with AMD or CommonJS.
    startOnPageLoad: true,

    // Should we restart the browser when pushState or replaceState is called?  (Generally
    // means ajax navigation has occured)
    restartOnPushState: true,

    // Should we show the progress bar for every ajax request (not just regular or ajax-y page
    // navigation)? Set to false to disable.
    //
    // If so, how many ms does the request have to be running for before we show the progress?
    restartOnRequestAfter: 500,

    // What element should the pace element be appended to on the page?
    target: 'body',

    elements: {
        // How frequently in ms should we check for the elements being tested for
        // using the element monitor?
        checkInterval: 100,

        // What elements should we wait for before deciding the page is fully loaded (not required)
        selectors: ['body']
    },

    eventLag: {
        // When we first start measuring event lag, not much is going on in the browser yet, so it's
        // not uncommon for the numbers to be abnormally low for the first few samples.  This configures
        // how many samples we need before we consider a low number to mean completion.
        minSamples: 10,

        // How many samples should we average to decide what the current lag is?
        sampleCount: 3,

        // Above how many ms of lag is the CPU considered busy?
        lagThreshold: 3
    },

    ajax: {
        // Which HTTP methods should we track?
        trackMethods: ['GET'],

        // Should we track web socket connections?
        trackWebSockets: true,

        // A list of regular expressions or substrings of URLS we should ignore (for both tracking and restarting)
        ignoreURLs: [] as (string | RegExp)[]
    }
};

const now = (): number =>
{
    if (performance && performance.now)
    {
        return performance.now();
    }

    return +new Date;
};

window.requestAnimationFrame =
    window.requestAnimationFrame ||
    (<any>window).mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    (<any>window).msRequestAnimationFrame;

window.cancelAnimationFrame =
    window.cancelAnimationFrame ||
    (<any>window).mozCancelAnimationFrame;

if (!window.requestAnimationFrame)
{
    window.requestAnimationFrame = (fn): number =>
    {
        return setTimeout(fn, 50);
    };

    window.cancelAnimationFrame = (id): void =>
    {
        clearTimeout(id);
    };
}

const runAnimation = (
    fn: (
        frameTime: number,
        enqueueNextFrame: () => void
    ) => void
): void =>
{
    let last = now();

    const tick = (): void =>
    {
        const diff = now() - last;

        if (diff >= 33)
        {
            // Don't run faster than 30 fps

            last = now();

            fn(diff, () =>
            {
                requestAnimationFrame(tick);
            });
        }
        else
        {
            setTimeout(tick, (33 - diff));
        }
    };

    tick();
};

const result = (
    obj: { [index: string]: any },
    key: string,
    ...args: any[]
): any =>
{
    if (typeof obj[key] === 'function')
    {
        return obj[key](...args);
    }
    else
    {
        return obj[key];
    }
};

const extend = (
    out: { [index: string]: any },
    ...sources: { [index: string]: any }[]
): typeof out =>
{
    for (const source of sources)
    {
        if (source)
        {
            for (const key of Object.keys(source))
            {
                const val = source[key];

                if (out[key] && (typeof out[key] === 'object') &&
                    val && (typeof val === 'object'))
                {
                    extend(out[key], val);
                }
                else
                {
                    out[key] = val;
                }
            }
        }
    }

    return out;
};

const avgAmplitude = (arr: number[]): number =>
{
    let count = 0;
    let sum = 0;

    for (const v of arr)
    {
        sum += Math.abs(v);

        count++;
    }

    return sum / count;
};

const getFromDOM = (key = 'options', json = true): any =>
{
    const el = document.querySelector(`[data-pace-${ key }]`);

    if (!el)
    {
        return;
    }

    const data = el.getAttribute(`data-pace-${ key }`);

    if (!json)
    {
        return data;
    }

    try
    {
        return JSON.parse(data);
    }
    catch (e)
    {
        console.error('Error parsing inline pace options', e);
    }
};



const Pace = (<any>window).Pace || {};
(<any>window).Pace = Pace;

class Pace extends Evented {

    options: typeof defaultOptions;

    constructor ()
    {
        super();
    }
}

const options = (Pace.options = extend({}, defaultOptions, (<any>window).paceOptions, getFromDOM()));

for (source of ['ajax', 'document', 'eventLag', 'elements'])
{
    // true enables them without configuration, so we grab the config from the defaults
    if (options[source] === true)
    {
        options[source] = defaultOptions[source];
    }
}

// TODO maybe remove
class NoTargetError extends Error {}

class Bar {

    progress = 0;
    lastRenderedProgress = 0;
    el: HTMLElement;

    // TODO maybe move initialization to constructor and use this.el across code instead
    getElement (): HTMLElement
    {
        if (!this.el)
        {
            const targetElement = document.querySelector(options.target);

            if (!targetElement)
            {
                throw new NoTargetError;
            }

            this.el = document.createElement('div');
            this.el.classList.add('pace', 'pace-active');

            document.body.classList.remove('pace-done');
            document.body.classList.add('pace-running');

            this.el.innerHTML = '\n' +
                '<div class="pace-progress">\n' +
                '    <div class="pace-progress-inner"></div>\n' +
                '</div>\n' +
                '<div class="pace-activity"></div>\n';

            if (targetElement.firstChild)
            {
                targetElement.insertBefore(this.el, targetElement.firstChild);
            }
            else
            {
                targetElement.appendChild(this.el);
            }
        }

        return this.el;
    }

    finish (): void
    {
        const el = this.getElement();

        el.classList.remove('pace-active');
        el.classList.add('pace-inactive');

        document.body.classList.remove('pace-running');
        document.body.classList.add('pace-done');
    }

    update (prog: number): void
    {
        this.progress = prog;

        this.render();
    }

    destroy (): void
    {
        try
        {
            this.getElement().parentNode.removeChild(this.getElement());
        }
        // eslint-disable-next-line no-empty
        catch (NoTargetError) {}

        this.el = undefined;
    }

    render (): void
    {
        if (!document.querySelector(options.target))
        {
            return;
        }

        const el = this.getElement();

        const transform = `translate3d(${ this.progress }%, 0, 0)`;
        for (const key of ['webkitTransform', 'msTransform', 'transform'])
        {
            (<any>el.children[0]).style[key] = transform;
        }

        if (!this.lastRenderedProgress ||
            (this.lastRenderedProgress|0) !== (this.progress|0))
        //   The whole-part of the number has changed
        {
            el.children[0].setAttribute(
                'data-progress-text',
                `${ this.progress|0 }%`
            );

            let progressStr: string;
            if (this.progress >= 100)
            {
                // We cap it at 99 so we can use prefix-based attribute selectors
                progressStr = '99';
            }
            else
            {
                progressStr = this.progress < 10 ? '0' : '';
                progressStr += this.progress|0;
            }

            el.children[0].setAttribute(
                'data-progress',
                `${ progressStr }`
            );
        }

        this.lastRenderedProgress = this.progress;
    }

    done (): boolean
    {
        return this.progress >= 100;
    }
}

// eslint-disable-next-line no-global-assign
XMLHttpRequest = XMLHttpRequestIntercepted;

if (WebSocket && options.ajax.trackWebSockets)
{
    // eslint-disable-next-line no-global-assign
    WebSocket = WebSocketIntercepted;
}

// TODO replace with inherited classes
const extendNative = (to, from) => (() =>
{
    const result1 = [];
    for (var key in from.prototype)
    {
        try
        {
            if ((to[key] == null) && (typeof from[key] !== 'function'))
            {
                if (typeof Object.defineProperty === 'function')
                {
                    result1.push(Object.defineProperty(to, key, {
                        get ()
                        {
                            return from.prototype[key];
                        }
                        ,
                        configurable: true,
                        enumerable: true }));
                }
                else
                {
                    result1.push(to[key] = from.prototype[key]);
                }
            }
            else
            {
                result1.push(undefined);
            }
        }
        catch (e) {}
    }
    return result1;
})();

const ignoreStack = [];

Pace.ignore = function (fn, ...args)
{
    ignoreStack.unshift('ignore');
    const ret = fn(...Array.from(args || []));
    ignoreStack.shift();
    return ret;
};

Pace.track = function (fn, ...args)
{
    ignoreStack.unshift('track');
    const ret = fn(...Array.from(args || []));
    ignoreStack.shift();
    return ret;
};

const shouldTrack = function (method)
{
    if (method == null) { method = 'GET'; }
    if (ignoreStack[0] === 'track')
    {
        return 'force';
    }

    if (!ignoreStack.length && options.ajax)
    {
        let needle;
        if ((method === 'socket') && options.ajax.trackWebSockets)
        {
            return true;
        }
        else if ((needle = method.toUpperCase(), Array.from(options.ajax.trackMethods).includes(needle)))
        {
            return true;
        }
    }

    return false;
};





const shouldIgnoreURL = function (url)
{
    for (const pattern of Array.from(options.ajax.ignoreURLs))
    {
        if (typeof pattern === 'string')
        {
            if (url.indexOf(pattern) !== -1)
            {
                return true;
            }

        }
        else
        {
            if (pattern.test(url))
            {
                return true;
            }
        }
    }

    return false;
};

// If we want to start the progress bar
// on every request, we need to hear the request
// and then inject it into the new ajax monitor
// start will have created.

requestIntercept.on('request', function ({type, request, url})
{
    if (shouldIgnoreURL(url)) { return; }

    if (!Pace.running && ((options.restartOnRequestAfter !== false) || (shouldTrack(type) === 'force')))
    {
        const args = arguments;

        let after = options.restartOnRequestAfter || 0;
        if (typeof after === 'boolean')
        {
            after = 0;
        }

        return setTimeout(function ()
        {
            let stillActive;
            if (type === 'socket')
            {
                stillActive = request.readyState < 2;
            }
            else
            {
                stillActive = 0 < request.readyState && request.readyState < 4;
            }

            if (stillActive)
            {
                Pace.restart();

                return (() =>
                {
                    const result1 = [];
                    for (source of Array.from(Pace.sources))
                    {
                        if (source instanceof AjaxMonitor)
                        {
                            source.watch(...Array.from(args || []));
                            break;
                        }
                        else
                        {
                            result1.push(undefined);
                        }
                    }
                    return result1;
                })();
            }
        }
        , after);
    }
});

class AjaxMonitor {
    constructor ()
    {
        this.elements = [];

        requestIntercept.on('request', function () { return this.watch(...arguments); }.bind(this));
    }

    watch ({type, request, url})
    {
        let tracker;
        if (shouldIgnoreURL(url)) { return; }

        if (type === 'socket')
        {
            tracker = new SocketRequestTracker(request);
        }
        else
        {
            tracker = new XHRRequestTracker(request);
        }

        return this.elements.push(tracker);
    }
}

class XHRRequestTracker {
    constructor (request)
    {
        this.progress = 0;

        if (window.ProgressEvent != null)
        {
            // We're dealing with a modern browser with progress event support

            const size = null;
            request.addEventListener('progress', evt =>
            {
                if (evt.lengthComputable)
                {
                    return this.progress = (100 * evt.loaded) / evt.total;
                }
                else
                {
                    // If it's chunked encoding, we have no way of knowing the total length of the
                    // response, all we can do is increment the progress with backoff such that we
                    // never hit 100% until it's done.
                    return this.progress = this.progress + ((100 - this.progress) / 2);
                }
            }
            , false);

            for (const event of ['load', 'abort', 'timeout', 'error'])
            {
                request.addEventListener(event, () =>
                {
                    return this.progress = 100;
                }
                , false);
            }

        }
        else
        {
            const _onreadystatechange = request.onreadystatechange;
            request.onreadystatechange = function ()
            {
                if ([0, 4].includes(request.readyState))
                {
                    this.progress = 100;
                }
                else if (request.readyState === 3)
                {
                    this.progress = 50;
                }

                return (typeof _onreadystatechange === 'function' ? _onreadystatechange(...arguments) : undefined);
            }.bind(this);
        }
    }
}

class SocketRequestTracker {
    constructor (request)
    {
        this.progress = 0;

        for (const event of ['error', 'open'])
        {
            request.addEventListener(event, () =>
            {
                return this.progress = 100;
            }
            , false);
        }
    }
}

class ElementMonitor {
    constructor (options)
    {
        if (options == null) { options = {}; }
        this.elements = [];

        if (options.selectors == null) { options.selectors = []; }
        for (const selector of Array.from(options.selectors))
        {
            this.elements.push(new ElementTracker(selector));
        }
    }
}

class ElementTracker {
    constructor (selector)
    {
        this.selector = selector;
        this.progress = 0;

        this.check();
    }

    check ()
    {
        if (document.querySelector(this.selector))
        {
            return this.done();
        }
        else
        {
            return setTimeout((() => this.check()),
                options.elements.checkInterval);
        }
    }

    done ()
    {
        return this.progress = 100;
    }
}

class DocumentMonitor {
    static initClass ()
    {
        this.prototype.states = {
            loading: 0,
            interactive: 50,
            complete: 100
        };
    }

    constructor ()
    {
        this.progress = this.states[document.readyState] != null ? this.states[document.readyState] : 100;

        const _onreadystatechange = document.onreadystatechange;
        document.onreadystatechange = function ()
        {
            if (this.states[document.readyState] != null)
            {
                this.progress = this.states[document.readyState];
            }

            return (typeof _onreadystatechange === 'function' ? _onreadystatechange(...arguments) : undefined);
        }.bind(this);
    }
}
DocumentMonitor.initClass();

class EventLagMonitor {
    constructor ()
    {
        this.progress = 0;

        let avg = 0;

        const samples = [];

        let points = 0;
        let last = now();
        var interval = setInterval(() =>
        {
            const diff = now() - last - 50;
            last = now();

            samples.push(diff);

            if (samples.length > options.eventLag.sampleCount)
            {
                samples.shift();
            }

            avg = avgAmplitude(samples);

            if ((++points >= options.eventLag.minSamples) && (avg < options.eventLag.lagThreshold))
            {
                this.progress = 100;

                return clearInterval(interval);
            }
            else
            {
                return this.progress = 100 * (3 / (avg + 3));
            }
        }

        , 50);
    }
}

class Scaler {
    constructor (source1)
    {
        this.source = source1;
        this.last = (this.sinceLastUpdate = 0);
        this.rate = options.initialRate;
        this.catchup = 0;
        this.progress = (this.lastProgress = 0);

        if (this.source != null)
        {
            this.progress = result(this.source, 'progress');
        }
    }

    tick (frameTime, val)
    {
        if (val == null) { val = result(this.source, 'progress'); }

        if (val >= 100)
        {
            this.done = true;
        }

        if (val === this.last)
        {
            this.sinceLastUpdate += frameTime;
        }
        else
        {
            if (this.sinceLastUpdate)
            {
                this.rate = (val - this.last) / this.sinceLastUpdate;
            }

            this.catchup = (val - this.progress) / options.catchupTime;

            this.sinceLastUpdate = 0;
            this.last = val;
        }

        if (val > this.progress)
        {
            // After we've got a datapoint, we have catchupTime to
            // get the progress bar to reflect that new data
            this.progress += this.catchup * frameTime;
        }

        const scaling = (1 - Math.pow(this.progress / 100, options.easeFactor));

        // Based on the rate of the last update, we preemptively update
        // the progress bar, scaling it so it can never hit 100% until we
        // know it's done.
        this.progress += scaling * this.rate * frameTime;

        this.progress = Math.min(this.lastProgress + options.maxProgressPerFrame, this.progress);

        this.progress = Math.max(0, this.progress);
        this.progress = Math.min(100, this.progress);

        this.lastProgress = this.progress;

        return this.progress;
    }
}

let sources = null;
let scalers = null;
let bar = null;
let uniScaler = null;
let animation = null;
let cancelAnimation = null;
Pace.running = false;

const handlePushState = function ()
{
    if (options.restartOnPushState)
    {
        return Pace.restart();
    }
};

// We reset the bar whenever it looks like an ajax navigation has occured.
if (window.history.pushState != null)
{
    const _pushState = window.history.pushState;
    window.history.pushState = function ()
    {
        handlePushState();

        return _pushState.apply(window.history, arguments);
    };
}

if (window.history.replaceState != null)
{
    const _replaceState = window.history.replaceState;
    window.history.replaceState = function ()
    {
        handlePushState();

        return _replaceState.apply(window.history, arguments);
    };
}

const SOURCE_KEYS = {
    ajax: AjaxMonitor,
    elements: ElementMonitor,
    document: DocumentMonitor,
    eventLag: EventLagMonitor
};

(init = function ()
{
    Pace.sources = (sources = []);

    for (const type of ['ajax', 'elements', 'document', 'eventLag'])
    {
        if (options[type] !== false)
        {
            sources.push(new (SOURCE_KEYS[type])(options[type]));
        }
    }

    for (source of Array.from(options.extraSources != null ? options.extraSources : []))
    {
        sources.push(new source(options));
    }

    Pace.bar = (bar = new Bar);

    // Each source of progress data has it's own scaler to smooth its output
    scalers = [];

    // We have an extra scaler for the final output to keep things looking nice as we add and
    // remove sources
    return uniScaler = new Scaler;
})();

Pace.stop = function ()
{
    Pace.trigger('stop');
    Pace.running = false;

    bar.destroy();

    // Not all browsers support cancelAnimationFrame
    cancelAnimation = true;

    if (animation != null)
    {
        if (typeof cancelAnimationFrame === 'function')
        {
            cancelAnimationFrame(animation);
        }
        animation = null;
    }

    return init();
};

Pace.restart = function ()
{
    Pace.trigger('restart');
    Pace.stop();
    return Pace.start();
};

Pace.go = function ()
{
    Pace.running = true;

    bar.render();

    const start = now();

    cancelAnimation = false;
    return animation =
        runAnimation( (frameTime, enqueueNextFrame) =>
        {
            // Every source gives us a progress number from 0 - 100
            // It's up to us to figure out how to turn that into a smoothly moving bar
            //
            // Their progress numbers can only increment.  We try to interpolate
            // between the numbers.

            let sum;
            const remaining = 100 - bar.progress;

            let count = (sum = 0);
            let done = true;
            // A source is composed of a bunch of elements, each with a raw, unscaled progress
            for (let i = 0; i < sources.length; i++)
            {
                source = sources[i];
                const scalerList = scalers[i] != null ? scalers[i] : (scalers[i] = []);

                const elements = source.elements != null ? source.elements : [source];

                // Each element is given it's own scaler, which turns its value into something
                // smoothed for display
                for (let j = 0; j < elements.length; j++)
                {
                    const element = elements[j];
                    const scaler = scalerList[j] != null ? scalerList[j] : (scalerList[j] = new Scaler(element));

                    done &= scaler.done;

                    if (scaler.done) { continue; }

                    count++;
                    sum += scaler.tick(frameTime);
                }
            }

            const avg = sum / count;

            bar.update(uniScaler.tick(frameTime, avg));

            if (bar.done() || done || cancelAnimation)
            {
                bar.update(100);

                Pace.trigger('done');

                return setTimeout(function ()
                {
                    bar.finish();

                    Pace.running = false;

                    return Pace.trigger('hide');
                }
                , Math.max(options.ghostTime, Math.max(options.minTime - (now() - start), 0)));
            }
            else
            {
                return enqueueNextFrame();
            }
        });
};

Pace.start = function (_options)
{
    extend(options, _options);

    Pace.running = true;

    try
    {
        bar.render();
    }
    catch (NoTargetError) {}

    // It's usually possible to render a bit before the document declares itself ready
    if (!document.querySelector('.pace'))
    {
        return setTimeout(Pace.start, 50);
    }
    else
    {
        Pace.trigger('start');
        return Pace.go();
    }
};

if ((typeof define === 'function') && define.amd)
{
    // AMD
    define(['pace'], () => Pace);
}
else if (typeof exports === 'object')
{
    // CommonJS
    module.exports = Pace;
}
else
{
    // Global
    if (options.startOnPageLoad)
    {
        Pace.start();
    }
}

function __guardMethod__ (obj, methodName, transform)
{
    if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function')
    {
        return transform(obj, methodName);
    }
    else
    {
        return undefined;
    }
}

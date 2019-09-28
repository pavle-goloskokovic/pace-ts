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
import XMLHttpRequestIntercepted from './src/ts/XMLHttpRequestIntercepted';
import WebSocketIntercepted from './src/ts/WebSocketIntercepted';
import AjaxMonitor from './src/ts/monitors/AjaxMonitor';
import Evented from './src/ts/Evented';
import PaceOptions, { options } from './src/ts/PaceOptions';
import requestIntercept, { SHOULD_TRACK } from './src/ts/RequestIntercept';
import extend from './src/ts/utils/extend';
import now from './src/ts/utils/now';
import SOURCES from './src/ts/sources';

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

// eslint-disable-next-line no-global-assign
XMLHttpRequest = XMLHttpRequestIntercepted;

if (WebSocket && options.ajax.trackWebSockets)
{
    // eslint-disable-next-line no-global-assign
    WebSocket = WebSocketIntercepted;
}

const runAnimation = (
    fn: (
        frameTime: number,
        enqueueNextFrame: () => number
    ) => number
): number =>
{
    let last = now();

    const tick = (): number =>
    {
        const diff = now() - last;

        if (diff >= 33)
        {
            // Don't run faster than 30 fps

            last = now();

            return fn(diff, () =>
            {
                return requestAnimationFrame(tick);
            });
        }
        else
        {
            return setTimeout(tick, (33 - diff));
        }
    };

    return tick();
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

// TODO figure out
/*const Pace = (<any>window).Pace || {};
(<any>window).Pace = Pace;*/

class Pace extends Evented {

    sources = null;
    scalers = null;
    bar = null;
    uniScaler = null;
    animationId: number;
    cancelAnimation: boolean;

    running = false;

    constructor ()
    {
        super();

        // If we want to start the progress bar
        // on every request, we need to hear the request
        // and then inject it into the new ajax monitor
        // start will have created.
        requestIntercept.on('request', (args: {
            type: string;
            request: XMLHttpRequest | WebSocket;
            url: string;
        }) =>
        {
            const {type, request, url} = args;

            if (requestIntercept.shouldIgnoreURL(url))
            {
                return;
            }

            if (!this.running && (
                options.restartOnRequestAfter !== false ||
                requestIntercept.shouldTrack(type) === SHOULD_TRACK.FORCE
            ))
            {
                let after = options.restartOnRequestAfter;
                if (typeof after === 'boolean')
                {
                    after = 0;
                }

                setTimeout(
                    () =>
                    {
                        let stillActive;
                        if (type === 'socket')
                        {
                            stillActive = (request as WebSocket).readyState < 2;
                        }
                        else
                        {
                            stillActive =
                                0 < (request as XMLHttpRequest).readyState &&
                                (request as XMLHttpRequest).readyState < 4;
                        }

                        if (stillActive)
                        {
                            this.restart();

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

        this.init();
    }

    init (): void
    {
        this.sources = [];

        for (const type of Object.keys(SOURCES))
        {
            if (options[type] !== false)
            {
                this.sources.push(new SOURCES[type](options[type]));
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
    }

    start (_options?: PaceOptions): void
    {
        extend(options, _options);

        this.running = true;

        try
        {
            this.bar.render();
        }
        // eslint-disable-next-line no-empty
        catch (NoTargetError) {}

        // It's usually possible to render a bit before the document declares itself ready
        if (!document.querySelector('.pace'))
        {
            setTimeout(this.start, 50);
        }
        else
        {
            this.trigger('start');

            this.go();
        }
    }

    restart (): void
    {
        this.trigger('restart');
        this.stop();
        this.start();
    }

    stop (): void
    {
        this.trigger('stop');

        this.running = false;

        this.bar.destroy();

        // Not all browsers support cancelAnimationFrame
        this.cancelAnimation = true;

        if (!this.animationId)
        {
            if (cancelAnimationFrame)
            {
                cancelAnimationFrame(this.animationId);
            }

            this.animationId = null;
        }

        this.init();
    }

    track (fn: (...args: any[]) => any, ...args: any[]): any
    {
        return requestIntercept.track(fn, ...args);
    }

    ignore (fn: (...args: any[]) => any, ...args: any[]): any
    {
        return requestIntercept.ignore(fn, ...args);
    }

    go ()
    {
        this.running = true;

        this.bar.render();

        const start = now();

        this.cancelAnimation = false;
        this.animationId = runAnimation( (frameTime, enqueueNextFrame) =>
        {
            // Every source gives us a progress number from 0 - 100
            // It's up to us to figure out how to turn that into a smoothly moving bar
            //
            // Their progress numbers can only increment. We try to interpolate
            // between the numbers.

            const remaining = 100 - this.bar.progress;

            let sum = 0;
            let count = 0;
            let done = true;

            // A source is composed of a bunch of elements, each with a raw, unscaled progress
            for (let i = 0; i < this.sources.length; i++)
            {
                const source = this.sources[i];

                const scalerList = this.scalers[i] != null ? scalers[i] : (scalers[i] = []);

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

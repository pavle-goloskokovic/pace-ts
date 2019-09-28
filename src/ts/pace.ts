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
import XMLHttpRequestIntercepted from './XMLHttpRequestIntercepted';
import WebSocketIntercepted from './WebSocketIntercepted';
import AjaxMonitor from './monitors/AjaxMonitor';
import Evented from './Evented';
import PaceOptions, { options } from './PaceOptions';
import requestIntercept, { SHOULD_TRACK } from './RequestIntercept';
import extend from './utils/extend';
import now from './utils/now';
import SOURCES from './sources';
import RequestArgs from './RequestArgs';
import Bar from './Bar';
import Scaler from './Scaler';
import Monitor from './monitors/Monitor';

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

class Pace extends Evented {

    sources: Monitor[];
    bar: Bar;
    scaler: Scaler;
    animationId: number;
    cancelAnimation: boolean;

    running = false;

    constructor ()
    {
        super();

        this.onRequest();

        this.handleWindowHistory();

        this.init();
    }

    init (): void
    {
        this.sources = [];

        for (const type of Object.keys(SOURCES))
        {
            if (options[type] !== false)
            {
                this.sources.push(new SOURCES[type]());
            }
        }

        if(options.extraSources)
        {
            for (const source of options.extraSources)
            {
                this.sources.push(new source(options));
            }
        }

        this.bar = new Bar;

        // We have an extra scaler for the final output to keep things looking
        // nice as we add and remove sources
        this.scaler = new Scaler;
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

    go (): void
    {
        this.running = true;

        this.bar.render();

        const start = now();

        this.cancelAnimation = false;
        this.animationId = this.runAnimation( (frameTime, enqueueNextFrame) =>
        {
            // Every source gives us a progress number from 0 - 100
            // It's up to us to figure out how to turn that into a smoothly moving bar
            //
            // Their progress numbers can only increment. We try to interpolate
            // between the numbers.

            let sum = 0;
            let count = 0;
            let done = true;

            // A source is composed of a bunch of elements, each with a raw, unscaled progress
            for (let i = 0; i < this.sources.length; i++)
            {
                const source = this.sources[i];
                const elements = source.elements;

                // Each element is given it's own scaler, which turns its value into something
                // smoothed for display
                for (let j = 0; j < elements.length; j++)
                {
                    const element = elements[j];
                    const scaler = element.scaler;

                    done = done && scaler.done;

                    if (scaler.done)
                    {
                        continue;
                    }

                    count++;
                    sum += scaler.tick(frameTime);
                }
            }

            const avg = sum / count;

            this.bar.update(this.scaler.tick(frameTime, avg));

            if (this.bar.done() || done || this.cancelAnimation)
            {
                this.bar.update(100);

                this.trigger('done');

                return setTimeout( () =>
                {
                    this.bar.finish();

                    this.running = false;

                    this.trigger('hide');
                }, Math.max(
                    options.ghostTime,
                    options.minTime - (now() - start),
                    0
                ));
            }
            else
            {
                return enqueueNextFrame();
            }
        });
    }

    runAnimation (
        fn: (frameTime: number, enqueueNextFrame: () => number) => number
    ): number
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
    }

    onRequest (): void
    {
        // If we want to start the progress bar
        // on every request, we need to hear the request
        // and then inject it into the new ajax monitor
        // start will have created.
        requestIntercept.on('request', (args: RequestArgs) =>
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

                setTimeout(() =>
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

                        for (const source of this.sources)
                        {
                            if (source instanceof AjaxMonitor)
                            {
                                source.watch(args);

                                break;
                            }
                        }
                    }

                }, after);
            }
        });
    }

    handleWindowHistory (): void
    {
        const handlePushState = (): void =>
        {
            if (options.restartOnPushState)
            {
                this.restart();
            }
        };

        // We reset the bar whenever it looks like an ajax navigation has occured.
        if (window.history.pushState)
        {
            const _pushState = window.history.pushState;
            window.history.pushState = (...args: any[]): void =>
            {
                handlePushState();

                _pushState.apply(window.history, args);
            };
        }

        if (window.history.replaceState)
        {
            const _replaceState = window.history.replaceState;
            window.history.replaceState = (...args: any[]): void =>
            {
                handlePushState();

                return _replaceState.apply(window.history, args);
            };
        }
    }
}

const pace = new Pace();
(<any>window).Pace = pace;

// Global
if (options.startOnPageLoad)
{
    pace.start();
}

export default pace;

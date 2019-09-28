import extend from './utils/extend';
import SOURCES from './sources';

export default interface PaceOptions {

    [index: string]: any;

    // How long should it take for the bar to animate to a new
    // point after receiving it
    catchupTime: number;

    // How quickly should the bar be moving before it has any progress
    // info from a new source in %/ms
    initialRate: number;

    // What is the minimum amount of time the bar should be on the
    // screen.  Irrespective of this number, the bar will always be on screen for
    // 33 * (100 / maxProgressPerFrame) + ghostTime ms.
    minTime: number;

    // What is the minimum amount of time the bar should sit after the last
    // update before disappearing
    ghostTime: number;

    // Its easy for a bunch of the bar to be eaten in the first few frames
    // before we know how much there is to load.  This limits how much of
    // the bar can be used per frame
    maxProgressPerFrame: number;

    // This tweaks the animation easing
    easeFactor: number;

    // Should pace automatically start when the page is loaded, or should it wait for `start` to
    // be called?  Always false if pace is loaded with AMD or CommonJS.
    startOnPageLoad: boolean;

    // Should we restart the browser when pushState or replaceState is called?  (Generally
    // means ajax navigation has occured)
    restartOnPushState: boolean;

    // Should we show the progress bar for every ajax request (not just regular or ajax-y page
    // navigation)? Set to false to disable.
    //
    // If so, how many ms does the request have to be running for before we show the progress?
    restartOnRequestAfter: number | boolean;

    // What element should the pace element be appended to on the page?
    target: string;

    elements: {
        // How frequently in ms should we check for the elements being tested for
        // using the element monitor?
        checkInterval: number;

        // What elements should we wait for before deciding the page is fully loaded (not required)
        selectors: string[];
    };

    eventLag: {
        // When we first start measuring event lag, not much is going on in the browser yet, so it's
        // not uncommon for the numbers to be abnormally low for the first few samples.  This configures
        // how many samples we need before we consider a low number to mean completion.
        minSamples: number;

        // How many samples should we average to decide what the current lag is?
        sampleCount: number;

        // Above how many ms of lag is the CPU considered busy?
        lagThreshold: number;
    };

    ajax: {
        // Which HTTP methods should we track?
        trackMethods: string[];

        // Should we track web socket connections?
        trackWebSockets: boolean;

        // A list of regular expressions or substrings of URLS we should ignore (for both tracking and restarting)
        ignoreURLs: (string | RegExp)[];
    };
}

const defaultOptions: PaceOptions = {
    catchupTime: 100,
    initialRate: .03,
    minTime: 250,
    ghostTime: 100,
    maxProgressPerFrame: 20,
    easeFactor: 1.25,
    startOnPageLoad: true,
    restartOnPushState: true,
    restartOnRequestAfter: 500,
    target: 'body',
    elements: {
        checkInterval: 100,
        selectors: ['body']
    },
    eventLag: {
        minSamples: 10,
        sampleCount: 3,
        lagThreshold: 3
    },
    ajax: {
        trackMethods: ['GET'],
        trackWebSockets: true,
        ignoreURLs: [] as (string | RegExp)[]
    }
};

const getFromDOM = (): PaceOptions =>
{
    const dataSelectorName = '[data-pace-options]';

    const el = document.querySelector(dataSelectorName);

    if (!el)
    {
        return;
    }

    const data = el.getAttribute(dataSelectorName);

    try
    {
        return JSON.parse(data);
    }
    catch (e)
    {
        console.error('Error parsing inline pace options', e);
    }
};

const options: PaceOptions = extend({},
    defaultOptions,
    (<any>window).paceOptions,
    getFromDOM()
) as PaceOptions;

for (const source of Object.keys(SOURCES))
{
    // true enables them without configuration, so we grab the config from the defaults
    if (options[source] === true)
    {
        options[source] = defaultOptions[source];
    }
}

export { options };


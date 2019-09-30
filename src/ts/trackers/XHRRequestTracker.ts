import Tracker from './Tracker';

export default class XHRRequestTracker extends Tracker{

    constructor (request: XMLHttpRequest)
    {
        super();

        if (window.ProgressEvent)
        {
            // We're dealing with a modern browser with progress event support

            request.addEventListener('progress', (evt: ProgressEvent): void =>
            {
                if (evt.lengthComputable)
                {
                    this.progress = evt.loaded / evt.total * 100;
                }
                else
                {
                    // If it's chunked encoding, we have no way of knowing the total length of the
                    // response, all we can do is increment the progress with backoff such that we
                    // never hit 100% until it's done.
                    this.progress = this.progress + (100 - this.progress)/2; // TODO move 2 to options?
                }
            }, false);

            for (const event of ['load', 'abort', 'timeout', 'error'])
            {
                request.addEventListener(event, (): void =>
                {
                    this.progress = 100;

                }, false);
            }

        }
        else
        {
            const _onreadystatechange = request.onreadystatechange;
            request.onreadystatechange = (...args: any[]): any =>
            {
                switch (request.readyState)
                {
                    case XMLHttpRequest.UNSENT:
                        this.progress = 0;
                        break;
                    case XMLHttpRequest.OPENED:
                        this.progress = 11;
                        break;
                    case XMLHttpRequest.HEADERS_RECEIVED:
                        this.progress = 22;
                        break;
                    case XMLHttpRequest.LOADING:
                        this.progress = 33;
                        break;
                    case XMLHttpRequest.DONE:
                        this.progress = 100;
                        break;
                }

                if(_onreadystatechange)
                {
                    (<any>_onreadystatechange)(...args);
                }
            };
        }
    }
}

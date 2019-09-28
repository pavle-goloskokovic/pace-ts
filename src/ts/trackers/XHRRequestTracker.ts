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
                    this.progress = this.progress + (100 - this.progress)/2;
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
            request.onreadystatechange = (...args: any[]): void =>
            {
                if ([0, 4].indexOf(request.readyState) !== -1)
                {
                    this.progress = 100;
                }
                else if (request.readyState === 3)
                {
                    this.progress = 50;
                }

                if(_onreadystatechange)
                {
                    (<any>_onreadystatechange)(...args);
                }
            };
        }
    }
}

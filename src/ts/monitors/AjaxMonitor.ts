import requestIntercept from '../RequestIntercept';
import RequestArgs from '../RequestArgs';
import SocketRequestTracker from '../trackers/SocketRequestTracker';
import XHRRequestTracker from '../trackers/XHRRequestTracker';
import Monitor from './Monitor';
import Tracker from '../trackers/Tracker';

export default class AjaxMonitor extends Monitor {

    constructor ()
    {
        super();

        requestIntercept.on('request',  (args: RequestArgs) =>
        {
            this.watch(args);
        });
    }

    watch (args: RequestArgs): void
    {
        const {type, request, url} = args;

        if (requestIntercept.shouldIgnoreURL(url))
        {
            return;
        }

        let tracker: Tracker;
        if (type === 'socket')
        {
            tracker = new SocketRequestTracker(request as WebSocket);
        }
        else
        {
            tracker = new XHRRequestTracker(request as XMLHttpRequest);
        }

        this.elements.push(tracker);
    }
}

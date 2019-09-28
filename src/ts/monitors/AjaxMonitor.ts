import requestIntercept from '../RequestIntercept';

export default class AjaxMonitor {

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

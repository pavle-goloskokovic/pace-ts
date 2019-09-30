import requestIntercept from './RequestIntercept';
import RequestArgs from './RequestArgs';

export default class XMLHttpRequestIntercepted extends XMLHttpRequest {

    open (method: string, url: string): void
    {
        if (requestIntercept.shouldTrack(method))
        {
            requestIntercept.trigger('request', <RequestArgs> {
                type: method,
                url,
                request: this
            });
        }

        super.open(method, url);
    }
}

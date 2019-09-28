import requestIntercept from './RequestIntercept';

export default class XMLHttpRequestIntercepted extends XMLHttpRequest {

    open (method: string, url: string): void
    {
        if (requestIntercept.shouldTrack(method))
        {
            requestIntercept.trigger('request', {method, url, request: this});
        }

        super.open(method, url);
    }
}

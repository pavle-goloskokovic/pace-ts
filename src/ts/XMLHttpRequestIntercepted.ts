
export default class XMLHttpRequestIntercepted extends XMLHttpRequest {

    open (method: string, url: string): void
    {
        // TODO emit if should track
        /*if (shouldTrack(type))
        {
            this.trigger('request', {type, url, request: req});
        }*/

        super.open(method, url);
    }
}

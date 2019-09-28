import requestIntercept from './RequestIntercept';
import RequestArgs from './RequestArgs';

export default class WebSocketIntercepted extends WebSocket {

    constructor (url: string, protocols?: string | string[])
    {
        super(url, protocols);

        if (requestIntercept.shouldTrack('socket'))
        {
            requestIntercept.trigger('request', <RequestArgs> {
                type: 'socket',
                url,
                protocols,
                request: this
            });
        }
    }
}

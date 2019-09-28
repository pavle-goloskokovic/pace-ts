import requestIntercept from './RequestIntercept';

export default class WebSocketIntercepted extends WebSocket {

    constructor (url: string, protocols?: string | string[])
    {
        super(url, protocols);

        if (requestIntercept.shouldTrack('socket'))
        {
            requestIntercept.trigger('request', {type: 'socket', url, protocols, request: this});
        }
    }
}

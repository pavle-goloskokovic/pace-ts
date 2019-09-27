export default class WebSocketIntercepted extends WebSocket {

    constructor (url: string, protocols?: string | string[])
    {

        /*if (shouldTrack('socket'))
        {
            this.trigger('request', {type: 'socket', url, protocols, request: req});
        }*/

        super(url, protocols);
    }
}

import Tracker from './Tracker';

export default class SocketRequestTracker extends Tracker {

    constructor (request: WebSocket)
    {
        super();

        for (const event of ['error', 'open'])
        {
            request.addEventListener(event, () =>
            {
                this.progress = 100;

            }, false);
        }
    }
}

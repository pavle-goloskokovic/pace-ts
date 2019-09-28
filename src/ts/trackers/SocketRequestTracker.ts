import Tracker from './Tracker';

export default class SocketRequestTracker extends Tracker {

    constructor (request: WebSocket)
    {
        super();

        /*TODO implement https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/progress_event*/

        for (const event of ['error', 'open'])
        {
            request.addEventListener(event, () =>
            {
                this.progress = 100;

            }, false);
        }
    }
}

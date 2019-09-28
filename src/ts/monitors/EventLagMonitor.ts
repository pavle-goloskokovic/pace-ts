import Monitor from './Monitor';
import EventLagTracker from '../trackers/EventLagTracker';

export default class EventLagMonitor extends Monitor {

    constructor ()
    {
        super();

        this.elements.push(new EventLagTracker());
    }
}

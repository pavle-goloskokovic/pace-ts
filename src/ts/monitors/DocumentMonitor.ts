import Monitor from './Monitor';
import DocumentTracker from '../trackers/DocumentTracker';

export default class DocumentMonitor extends Monitor {

    constructor ()
    {
        super();

        this.elements.push(new DocumentTracker());
    }
}

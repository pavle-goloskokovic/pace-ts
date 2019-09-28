import ElementTracker from '../trackers/ElementTracker';
import Monitor from './Monitor';
import { options } from '../PaceOptions';

export default class ElementMonitor extends Monitor {

    constructor ()
    {
        super();

        if (!options.elements.selectors)
        {
            return;
        }

        for (const selector of options.selectors)
        {
            this.elements.push(new ElementTracker(selector));
        }
    }
}

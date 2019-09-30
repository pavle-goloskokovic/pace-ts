import ElementTracker from '../trackers/ElementTracker';
import Monitor from './Monitor';
import { options } from '../PaceOptions';

export default class ElementMonitor extends Monitor {

    constructor ()
    {
        super();

        if (options.elements && options.elements.selectors)
        {
            for (const selector of options.elements.selectors)
            {
                this.elements.push(new ElementTracker(selector));
            }
        }
    }
}

import ElementTracker from '../trackers/ElementTracker';
import Monitor from './Monitor';

export default class ElementMonitor extends Monitor {

    constructor (options: { selectors?: string[] } = {})
    {
        super();

        if (!options.selectors)
        {
            return;
        }

        for (const selector of options.selectors)
        {
            this.elements.push(new ElementTracker(selector));
        }
    }
}

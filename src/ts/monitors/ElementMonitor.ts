import ElementTracker from './ElementTracker';

export default class ElementMonitor {

    elements: ElementTracker[] = [];

    constructor (options: {
        selectors?: string[];
    } = {})
    {
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

import { options } from '../PaceOptions';
import Tracker from './Tracker';

export default class ElementTracker extends Tracker {

    constructor (private selector: string)
    {
        super();

        this.check();
    }

    check (): void
    {
        if (document.querySelector(this.selector))
        {
            this.progress = 100;
        }
        else
        {
            setTimeout(this.check, options.elements.checkInterval);
        }
    }
}

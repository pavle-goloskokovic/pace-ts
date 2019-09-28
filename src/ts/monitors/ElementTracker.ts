import { options } from '../PaceOptions';

export default class ElementTracker {

    progress = 0;

    constructor (private selector: string)
    {
        this.check();
    }

    check (): void
    {
        if (document.querySelector(this.selector))
        {
            this.done();
        }
        else
        {
            setTimeout(this.check, options.elements.checkInterval);
        }
    }

    done (): void
    {
        this.progress = 100;
    }
}

import {options} from './PaceOptions';
import Tracker from './trackers/Tracker';

export default class Scaler {

    last = 0;
    sinceLastUpdate = 0;
    rate = options.initialRate;
    catchup = 0;
    progress = 0;
    lastProgress = 0;

    done: boolean;

    constructor (private source?: Tracker)
    {
        if (this.source)
        {
            this.progress = this.getSourceProgress();
        }
    }

    tick (frameTime: number, val = this.getSourceProgress()): number
    {
        if (val >= 100)
        {
            this.done = true;
        }

        if (val === this.last)
        {
            this.sinceLastUpdate += frameTime;
        }
        else
        {
            if (this.sinceLastUpdate)
            {
                this.rate = (val - this.last) / this.sinceLastUpdate;
            }

            this.catchup = (val - this.progress) / options.catchupTime;

            this.sinceLastUpdate = 0;
            this.last = val;
        }

        if (val > this.progress)
        {
            // After we've got a datapoint, we have catchupTime to
            // get the progress bar to reflect that new data
            this.progress += this.catchup * frameTime;
        }

        const scaling = (1 - Math.pow(this.progress / 100, options.easeFactor));

        // Based on the rate of the last update, we preemptively update
        // the progress bar, scaling it so it can never hit 100% until we
        // know it's done.
        this.progress += scaling * this.rate * frameTime;

        this.progress = Math.min(this.lastProgress + options.maxProgressPerFrame, this.progress);

        this.progress = Math.max(0, this.progress);
        this.progress = Math.min(100, this.progress);

        this.lastProgress = this.progress;

        return this.progress;
    }

    getSourceProgress (): number
    {
        if(typeof this.source.progress === 'function')
        {
            return (<() => number>this.source.progress)();
        }
        else
        {
            return this.source.progress;
        }
    }
}

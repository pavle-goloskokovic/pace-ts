import now from '../utils/now';
import { options } from '../PaceOptions';
import Tracker from './Tracker';

export default class EventLagTracker extends Tracker {

    constructor ()
    {
        super();

        let avg = 0;

        const samples: number[] = [];

        let points = 0;
        let last = now();

        const interval = setInterval((): void =>
        {
            const diff = now() - last - 50;

            last = now();

            samples.push(diff);

            if (samples.length > options.eventLag.sampleCount)
            {
                samples.shift();
            }

            avg = this.avgAmplitude(samples);

            if (++points >= options.eventLag.minSamples &&
                avg < options.eventLag.lagThreshold)
            {
                this.progress = 100;

                clearInterval(interval);
            }
            else
            {
                this.progress = 100 * (3 / (avg + 3));
            }
        }, 50);
    }

    avgAmplitude = (arr: number[]): number =>
    {
        let sum = 0;
        let count = 0;

        for (const v of arr)
        {
            sum += Math.abs(v);

            count++;
        }

        return sum / count;
    };
}

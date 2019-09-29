import Monitor from './Monitor';
import PaceOptions from '../PaceOptions';

export default class ExtraMonitor extends Monitor {

    constructor (public options: PaceOptions)
    {
        super();
    }
}

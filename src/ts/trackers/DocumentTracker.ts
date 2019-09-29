import Tracker from './Tracker';

const states: {
    [index: string]: number;
} = {
    loading: 33,
    interactive: 66,
    complete: 100
};

export default class DocumentTracker extends Tracker {

    constructor ()
    {
        super();

        this.progress = states[document.readyState] || 0;

        const _onreadystatechange = document.onreadystatechange;
        document.onreadystatechange = (...args: any[]): any =>
        {
            this.progress = states[document.readyState] || this.progress;

            if(_onreadystatechange)
            {
                (<any>_onreadystatechange)(...args);
            }
        };
    }
}


export default class DocumentMonitor {

    progress: number;

    states = {
        loading: 0,
        interactive: 50,
        complete: 100
    };

    constructor ()
    {
        this.progress = this.states[document.readyState] || 100;

        const _onreadystatechange = document.onreadystatechange;
        document.onreadystatechange = (...args: any[]): any =>
        {
            if (this.states[document.readyState])
            {
                this.progress = this.states[document.readyState];
            }

            if(_onreadystatechange)
            {
                (<any>_onreadystatechange)(...args);
            }
        };
    }
}

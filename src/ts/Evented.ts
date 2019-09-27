interface Bindings {
    [index: string]: {
        handler: (...args: any[]) => any;
        ctx: any;
        once: boolean;
    }[];
}

export default class Evented {

    bindings: Bindings = {};

    on (event: string, handler: (...args: any[]) => any, ctx: any = this, once = false): void
    {
        if (!this.bindings[event])
        {
            this.bindings[event] = [];
        }

        this.bindings[event].push({
            handler,
            ctx,
            once
        });
    }

    once (event: string, handler: (...args: any[]) => any, ctx?: any): void
    {
        this.on(event, handler, ctx, true);
    }

    off (event: string, handler?: (...args: any[]) => any): void
    {
        if (!this.bindings[event])
        {
            return;
        }

        if (!handler)
        {
            delete this.bindings[event];

            return;
        }

        let i = 0;

        while (i < this.bindings[event].length)
        {
            if (this.bindings[event][i].handler === handler)
            {
                this.bindings[event].splice(i, 1);
            }
            else
            {
                i++;
            }
        }
    }

    trigger (event: string, ...args: any[]): void
    {
        if (this.bindings[event])
        {
            let i = 0;

            while (i < this.bindings[event].length)
            {
                const {handler, ctx, once} = this.bindings[event][i];

                handler.apply(ctx, args);

                if (once)
                {
                    this.bindings[event].splice(i, 1);
                }
                else
                {
                    i++;
                }
            }
        }
    }
}

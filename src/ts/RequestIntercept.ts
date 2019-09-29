import Evented from './Evented';
import  { options } from './PaceOptions';

export enum SHOULD_TRACK {
    FALSE,
    TRUE,
    FORCE
}

class RequestIntercept extends Evented {

    ignoreStack: string[] = [];

    ignore (fn: (...args: any[]) => any, ...args: any[]): any
    {
        this.ignoreStack.unshift('ignore');
        const ret = fn(...args);
        this.ignoreStack.shift();
        return ret;
    }

    track (fn: (...args: any[]) => any, ...args: any[]): any
    {
        this.ignoreStack.unshift('track');
        const ret = fn(...args);
        this.ignoreStack.shift();
        return ret;
    }

    shouldTrack (method = 'GET'): SHOULD_TRACK
    {
        if (this.ignoreStack[0] === 'track')
        {
            return SHOULD_TRACK.FORCE;
        }

        if (!this.ignoreStack.length && options.ajax)
        {
            if (method === 'socket' &&
                options.ajax.trackWebSockets)
            {
                return SHOULD_TRACK.TRUE;
            }
            else if (options.ajax.trackMethods
                .indexOf(method.toUpperCase()) !== -1 )
            {
                return SHOULD_TRACK.TRUE;
            }
        }

        return SHOULD_TRACK.FALSE;
    }

    shouldIgnoreURL (url: string): boolean
    {
        for (const pattern of options.ajax.ignoreURLs)
        {
            if (typeof pattern === 'string')
            {
                if (url.indexOf(pattern) !== -1)
                {
                    return true;
                }
            }
            else
            {
                if (pattern.test(url))
                {
                    return true;
                }
            }
        }

        return false;
    }
}

// We should only ever instantiate one of these
export default new RequestIntercept();

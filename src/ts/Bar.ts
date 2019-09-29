import { options } from './PaceOptions';

export default class Bar {

    progress = 0;
    lastRenderedProgress = 0;
    el: HTMLElement;

    constructor ()
    {
        const targetElement = document.querySelector(options.target);

        this.el = document.createElement('div');
        this.el.classList.add('pace', 'pace-active');

        document.body.classList.remove('pace-done');
        document.body.classList.add('pace-running');

        this.el.innerHTML = '\n' +
            '<div class="pace-progress">\n' +
            '    <div class="pace-progress-inner"></div>\n' +
            '</div>\n' +
            '<div class="pace-activity"></div>\n';

        if (targetElement.firstChild)
        {
            targetElement.insertBefore(this.el, targetElement.firstChild);
        }
        else
        {
            targetElement.appendChild(this.el);
        }
    }

    finish (): void
    {
        this.el.classList.remove('pace-active');
        this.el.classList.add('pace-inactive');

        document.body.classList.remove('pace-running');
        document.body.classList.add('pace-done');
    }

    update (prog: number): void
    {
        this.progress = prog;

        this.render();
    }

    destroy (): void
    {
        this.el.parentNode.removeChild(this.el);

        this.el = undefined;

        document.body.classList.remove('pace-done');
    }

    render (): void
    {
        const transform = `translate3d(${ this.progress }%, 0, 0)`;
        for (const key of ['webkitTransform', 'msTransform', 'transform'])
        {
            (<any>this.el.children[0]).style[key] = transform;
        }

        if (!this.lastRenderedProgress ||
            (this.lastRenderedProgress|0) !== (this.progress|0))
        // The whole-part of the number has changed
        {
            this.el.children[0].setAttribute(
                'data-progress-text',
                `${ this.progress|0 }%`
            );

            let progressStr: string;
            if (this.progress >= 100)
            {
                // We cap it at 99 so we can use prefix-based attribute selectors
                progressStr = '99';
            }
            else
            {
                progressStr = this.progress < 10 ? '0' : '';
                progressStr += this.progress|0;
            }

            this.el.children[0].setAttribute(
                'data-progress',
                `${ progressStr }`
            );
        }

        this.lastRenderedProgress = this.progress;
    }

    done (): boolean
    {
        return this.progress >= 100;
    }
}

import { options } from './PaceOptions';

class NoTargetError extends Error {}

export default class Bar {

    progress = 0;
    lastRenderedProgress = 0;
    el: HTMLElement;

    // TODO maybe move initialization to constructor and use this.el across code instead
    getElement (): HTMLElement
    {
        if (!this.el)
        {
            const targetElement = document.querySelector(options.target);

            if (!targetElement)
            {
                throw new NoTargetError;
            }

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

        return this.el;
    }

    finish (): void
    {
        const el = this.getElement();

        el.classList.remove('pace-active');
        el.classList.add('pace-inactive');

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
        try
        {
            this.getElement().parentNode.removeChild(this.getElement());
        }
        // eslint-disable-next-line no-empty
        catch (NoTargetError) {}

        this.el = undefined;
    }

    render (): void
    {
        if (!document.querySelector(options.target))
        {
            return;
        }

        const el = this.getElement();

        const transform = `translate3d(${ this.progress }%, 0, 0)`;
        for (const key of ['webkitTransform', 'msTransform', 'transform'])
        {
            (<any>el.children[0]).style[key] = transform;
        }

        if (!this.lastRenderedProgress ||
            (this.lastRenderedProgress|0) !== (this.progress|0))
        //   The whole-part of the number has changed
        {
            el.children[0].setAttribute(
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

            el.children[0].setAttribute(
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

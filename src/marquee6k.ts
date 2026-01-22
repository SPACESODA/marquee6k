/**
 * marquee6k
 * http://github.com/SPACESODA/marquee6k
 * MIT License
 */

'use strict';

type Axis = 'x' | 'y';
type Direction = 'left' | 'right' | 'up' | 'down';

interface MarqueeOptions {
    selector?: string;
    className?: string;
    speed?: number;
    reverse?: boolean;
    pausable?: boolean;
    axis?: Axis;
    direction?: Direction;
    onInit?: (instance: marquee6k) => void;
    onUpdate?: (instance: marquee6k) => void;
    onPause?: (instance: marquee6k) => void;
    onPlay?: (instance: marquee6k) => void;
    onUpdateThrottle?: number;
}

const DEFAULT_SELECTOR = 'marquee6k';
const DEFAULT_SPEED = 0.25;

function parseBoolean(value: string | undefined): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

function normalizeDirection(value?: string): Direction | undefined {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (lowered === 'left' || lowered === 'right' || lowered === 'up' || lowered === 'down') {
        return lowered;
    }
    return undefined;
}

function normalizeAxis(value?: string): Axis | undefined {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (lowered === 'x' || lowered === 'horizontal' || lowered === 'h') return 'x';
    if (lowered === 'y' || lowered === 'vertical' || lowered === 'v') return 'y';
    return undefined;
}

function directionToAxis(direction: Direction): Axis {
    return direction === 'up' || direction === 'down' ? 'y' : 'x';
}

function directionToReverse(direction: Direction): boolean {
    return direction === 'right' || direction === 'down';
}

function getNow(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function normalizeSelector(selector?: string): string {
    const raw = (selector ?? DEFAULT_SELECTOR).trim();
    if (!raw) return `.${DEFAULT_SELECTOR}`;

    // Treat bare values as class names; otherwise assume full CSS selector.
    const hasSelectorSyntax = /[\s.#\[\]:>+~*,]/.test(raw);
    return hasSelectorSyntax ? raw : `.${raw}`;
}

function normalizeClassName(value?: string): string | undefined {
    if (!value) return undefined;
    const raw = value.trim();
    if (!raw) return undefined;
    const withoutDot = raw.startsWith('.') ? raw.slice(1) : raw;
    if (!withoutDot || /[\s.#\[\]:>+~*,]/.test(withoutDot)) return undefined;
    return withoutDot;
}

function deriveClassNameFromSelector(selector?: string): string {
    const raw = (selector ?? '').trim();
    if (!raw) return DEFAULT_SELECTOR;

    if (!/[\s.#\[\]:>+~*,]/.test(raw)) return raw;

    const singleClass = raw.match(/^\.([A-Za-z0-9_-]+)$/);
    if (singleClass) return singleClass[1];

    const classMatches = raw.match(/\.([A-Za-z0-9_-]+)/g);
    if (classMatches && classMatches.length > 0) {
        return classMatches[classMatches.length - 1].slice(1);
    }

    return DEFAULT_SELECTOR;
}

function resolveClassName(selector?: string, className?: string): string {
    // Prefer explicit className; otherwise derive from selector to keep __copy valid.
    const normalized = normalizeClassName(className);
    if (className && !normalized) {
        throw new Error('Invalid className option. Provide a single class name without spaces or selector syntax.');
    }
    return normalized ?? deriveClassNameFromSelector(selector);
}

// Augment window to include MARQUEES
declare global {
    interface Window {
        MARQUEES: marquee6k[];
    }
}

let MARQUEES: marquee6k[] = [];
let animationId: number = 0;
let resizeHandler: (() => void) | null = null;
let resizeTimer: number | undefined;
const EVENT_HANDLERS = new WeakMap<HTMLElement, { enter: () => void; leave: () => void }>();

function prepareElement(element: HTMLElement) {
    // If re-initializing, remove any previous wrapper so wrappers do not nest.
    const wrapper = element.firstElementChild;
    if (wrapper && wrapper.classList.contains('marquee6k__wrapper')) {
        const original = wrapper.firstElementChild as HTMLElement | null;
        element.innerHTML = '';
        if (original) element.appendChild(original);
    }
    element.classList.remove('is-init');
}

class marquee6k {
    element: HTMLElement;
    selector: string;
    className: string;
    axis: Axis;
    direction: Direction;
    speed: number;
    pausable: boolean;
    reverse: boolean;
    paused: boolean;
    parent: HTMLElement;
    parentProps: DOMRect;
    content: HTMLElement;
    innerContent: string;
    wrapStyles: string;
    offset: number;
    wrapper!: HTMLElement;
    contentWidth!: number;
    requiredReps!: number;
    updateThrottleMs?: number;
    lastUpdateTime: number;
    onInit?: (instance: marquee6k) => void;
    onUpdate?: (instance: marquee6k) => void;
    onPause?: (instance: marquee6k) => void;
    onPlay?: (instance: marquee6k) => void;

    constructor(element: HTMLElement, options: MarqueeOptions) {
        if (element.children.length === 0) {
            throw new Error('Encountered a marquee element without children, please supply a wrapper for your content');
        }

        this.element = element;
        this.selector = options.selector || DEFAULT_SELECTOR;
        this.className = resolveClassName(options.selector, options.className);

        // Direction/axis/ reverse: data-* overrides init defaults.
        const dataDirection = normalizeDirection(element.dataset.direction);
        const optionDirection = normalizeDirection(options.direction);
        const dataAxis = normalizeAxis(element.dataset.axis);
        const optionAxis = options.axis;
        const direction = dataDirection || optionDirection;
        const dataReverse = parseBoolean(element.dataset.reverse);
        const resolvedReverse = dataReverse ?? options.reverse ?? false;

        if (direction) {
            this.axis = directionToAxis(direction);
            this.reverse = directionToReverse(direction);
            this.direction = direction;
        } else {
            this.axis = dataAxis || optionAxis || 'x';
            this.reverse = resolvedReverse;
            if (this.axis === 'y') {
                this.direction = this.reverse ? 'down' : 'up';
            } else {
                this.direction = this.reverse ? 'right' : 'left';
            }
        }

        const dataSpeed = parseFloat(element.dataset.speed || '');
        this.speed = Number.isFinite(dataSpeed) ? dataSpeed : options.speed ?? DEFAULT_SPEED;

        const dataPausable = parseBoolean(element.dataset.pausable);
        this.pausable = dataPausable ?? options.pausable ?? false;

        this.paused = false;
        const parent = element.parentElement;
        if (!parent) {
            throw new Error('Encountered a marquee element without a parent. Please wrap it in a container.');
        }
        this.parent = parent;
        this.parentProps = this.parent.getBoundingClientRect();
        this.content = element.children[0] as HTMLElement;
        this.innerContent = this.content.innerHTML;
        this.wrapStyles = '';
        this.offset = 0;
        // Initialize lastUpdateTime so throttled callbacks can fire immediately.
        this.updateThrottleMs = options.onUpdateThrottle;
        this.lastUpdateTime = this.updateThrottleMs ? getNow() - this.updateThrottleMs : 0;
        this.onInit = options.onInit;
        this.onUpdate = options.onUpdate;
        this.onPause = options.onPause;
        this.onPlay = options.onPlay;

        this._setupWrapper();
        this._setupContent();
        this._setupEvents();

        this._reflow();
        this.element.appendChild(this.wrapper);
        this.onInit?.(this);
    }

    _setupWrapper() {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('marquee6k__wrapper');
        if (this.axis === 'x') {
            this.wrapper.style.whiteSpace = 'nowrap';
        } else {
            this.wrapper.style.display = 'block';
        }
    }

    _setupContent() {
        this.content.classList.add(`${this.className}__copy`);
        this.content.style.display = this.axis === 'x' ? 'inline-block' : 'block';
    }

    _setupEvents() {
        const existing = EVENT_HANDLERS.get(this.element);
        if (existing) {
            this.element.removeEventListener('mouseenter', existing.enter);
            this.element.removeEventListener('mouseleave', existing.leave);
        }

        const enter = () => {
            if (this.pausable) this.pause();
        };

        const leave = () => {
            if (this.pausable) this.play();
        };

        EVENT_HANDLERS.set(this.element, { enter, leave });
        this.element.addEventListener('mouseenter', enter);
        this.element.addEventListener('mouseleave', leave);
    }

    _createClone() {
        const clone = this.content.cloneNode(true) as HTMLElement;
        clone.style.display = this.axis === 'x' ? 'inline-block' : 'block';
        clone.classList.add(`${this.className}__copy`);
        this.wrapper.appendChild(clone);
    }

    _getContentSize() {
        return this.axis === 'x' ? this.content.offsetWidth : this.content.offsetHeight;
    }

    _getParentSize() {
        return this.axis === 'x' ? this.parentProps.width : this.parentProps.height;
    }

    _reflow() {
        // Recalculate sizes and rebuild clones to fill the viewport.
        this.parentProps = this.parent.getBoundingClientRect();
        this.contentWidth = this._getContentSize();

        const parentSize = this._getParentSize();
        const contentSize = this.contentWidth;

        this.requiredReps =
            contentSize === 0
                ? 1
                : contentSize > parentSize
                  ? 2
                  : Math.ceil((parentSize - contentSize) / contentSize) + 1;

        this.wrapper.innerHTML = '';
        this.wrapper.appendChild(this.content);

        for (let i = 0; i < this.requiredReps; i++) {
            this._createClone();
        }

        this.offset = this.reverse ? contentSize * -1 : 0;
        this.element.classList.add('is-init');
    }

    animate() {
        if (!this.paused) {
            // Move content and loop seamlessly.
            const isScrolled = this.reverse ? this.offset < 0 : this.offset > this.contentWidth * -1;
            const direction = this.reverse ? -1 : 1;
            const reset = this.reverse ? this.contentWidth * -1 : 0;

            if (isScrolled) this.offset -= this.speed * direction;
            else this.offset = reset;

            const translateX = this.axis === 'x' ? this.offset : 0;
            const translateY = this.axis === 'y' ? this.offset : 0;
            this.wrapper.style.transform = `translate(${translateX}px, ${translateY}px) translateZ(0)`;

            if (this.onUpdate) {
                // Throttle onUpdate to reduce callback overhead when desired.
                const throttle = this.updateThrottleMs;
                if (!throttle || throttle <= 0) {
                    this.onUpdate(this);
                } else {
                    const now = getNow();
                    if (now - this.lastUpdateTime >= throttle) {
                        this.lastUpdateTime = now;
                        this.onUpdate(this);
                    }
                }
            }
        }
    }

    _refresh() {
        this._reflow();
    }

    repopulate(difference: number, isLarger: boolean) {
        void difference;
        void isLarger;
        this._reflow();
    }

    static refresh(index: number) {
        MARQUEES[index]._refresh();
    }

    static pause(index: number) {
        MARQUEES[index].pause();
    }

    static play(index: number) {
        MARQUEES[index].play();
    }

    static toggle(index: number) {
        MARQUEES[index].toggle();
    }

    static refreshAll() {
        for (let i = 0; i < MARQUEES.length; i++) {
            MARQUEES[i]._refresh();
        }
    }

    static pauseAll() {
        for (let i = 0; i < MARQUEES.length; i++) {
            MARQUEES[i].pause();
        }
    }

    static playAll() {
        for (let i = 0; i < MARQUEES.length; i++) {
            MARQUEES[i].play();
        }
    }

    static toggleAll() {
        for (let i = 0; i < MARQUEES.length; i++) {
            MARQUEES[i].toggle();
        }
    }

    pause() {
        if (!this.paused) {
            this.paused = true;
            this.onPause?.(this);
        }
    }

    play() {
        if (this.paused) {
            this.paused = false;
            this.onPlay?.(this);
        }
    }

    toggle() {
        if (this.paused) this.play();
        else this.pause();
    }

    static init(options: MarqueeOptions = {}) {
        if (animationId) window.cancelAnimationFrame(animationId);
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        if (resizeTimer) window.clearTimeout(resizeTimer);

        MARQUEES = [];
        window.MARQUEES = MARQUEES;
        const selector = normalizeSelector(options.selector);
        const marquees = Array.from(document.querySelectorAll(selector)) as HTMLElement[];

        for (let i = 0; i < marquees.length; i++) {
            const marquee = marquees[i];
            prepareElement(marquee);
            const instance = new marquee6k(marquee, options);
            MARQUEES.push(instance);
        }

        animate();

        function animate() {
            for (let i = 0; i < MARQUEES.length; i++) {
                MARQUEES[i].animate();
            }

            animationId = window.requestAnimationFrame(animate);
        }

        // Debounced resize reflow to keep clones in sync with layout changes.
        resizeHandler = () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(() => {
                for (let i = 0; i < MARQUEES.length; i++) {
                    MARQUEES[i]._refresh();
                }
            }, 250);
        };

        window.addEventListener('resize', resizeHandler);
    }
}

export default marquee6k;

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.marquee6k = factory());
})(this, (function () { 'use strict';

    /**
     * marquee6k
     * http://github.com/SPACESODA/marquee6k
     * MIT License
     */
    const DEFAULT_SELECTOR = 'marquee6k';
    const DEFAULT_SPEED = 0.25;
    const DEFAULT_SCRUB_DELAY = 250;
    const SCRUB_THRESHOLD = 10;
    const MOMENTUM_FRICTION = 0.92;
    const MOMENTUM_STOP = 0.02;
    const MOMENTUM_MAX_VELOCITY = 2.5;
    const MOMENTUM_MIN_DELTA = 0.5;
    function parseBoolean(value) {
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        return undefined;
    }
    function parseBooleanOrNumber(value) {
        if (value === undefined)
            return undefined;
        if (value.trim() === '')
            return true;
        const booleanValue = parseBoolean(value);
        if (booleanValue !== undefined)
            return booleanValue;
        const numberValue = parseFloat(value);
        return Number.isFinite(numberValue) ? numberValue : undefined;
    }
    function normalizeDirection(value) {
        if (!value)
            return undefined;
        const lowered = value.toLowerCase();
        if (lowered === 'left' || lowered === 'right' || lowered === 'up' || lowered === 'down') {
            return lowered;
        }
        return undefined;
    }
    function normalizeAxis(value) {
        if (!value)
            return undefined;
        const lowered = value.toLowerCase();
        if (lowered === 'x' || lowered === 'horizontal' || lowered === 'h')
            return 'x';
        if (lowered === 'y' || lowered === 'vertical' || lowered === 'v')
            return 'y';
        return undefined;
    }
    function directionToAxis(direction) {
        return direction === 'up' || direction === 'down' ? 'y' : 'x';
    }
    function directionToReverse(direction) {
        return direction === 'right' || direction === 'down';
    }
    function getNow() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
    function normalizeSelector(selector) {
        const raw = (selector ?? DEFAULT_SELECTOR).trim();
        if (!raw)
            return `.${DEFAULT_SELECTOR}`;
        // Treat bare values as class names; otherwise assume full CSS selector.
        const hasSelectorSyntax = /[\s.#\[\]:>+~*,]/.test(raw);
        return hasSelectorSyntax ? raw : `.${raw}`;
    }
    function normalizeClassName(value) {
        if (!value)
            return undefined;
        const raw = value.trim();
        if (!raw)
            return undefined;
        const withoutDot = raw.startsWith('.') ? raw.slice(1) : raw;
        if (!withoutDot || /[\s.#\[\]:>+~*,]/.test(withoutDot))
            return undefined;
        return withoutDot;
    }
    function deriveClassNameFromSelector(selector) {
        const raw = (selector ?? '').trim();
        if (!raw)
            return DEFAULT_SELECTOR;
        if (!/[\s.#\[\]:>+~*,]/.test(raw))
            return raw;
        const singleClass = raw.match(/^\.([A-Za-z0-9_-]+)$/);
        if (singleClass)
            return singleClass[1];
        const classMatches = raw.match(/\.([A-Za-z0-9_-]+)/g);
        if (classMatches && classMatches.length > 0) {
            return classMatches[classMatches.length - 1].slice(1);
        }
        return DEFAULT_SELECTOR;
    }
    function resolveClassName(selector, className) {
        // Prefer explicit className; otherwise derive from selector to keep __copy valid.
        const normalized = normalizeClassName(className);
        if (className && !normalized) {
            throw new Error('Invalid className option. Provide a single class name without spaces or selector syntax.');
        }
        return normalized ?? deriveClassNameFromSelector(selector);
    }
    let MARQUEES = [];
    let animationId = 0;
    let resizeHandler = null;
    let resizeTimer;
    const EVENT_HANDLERS = new WeakMap();
    function prepareElement(element) {
        // Remove previous wrapper so re-init never nests wrappers.
        const wrapper = element.firstElementChild;
        if (wrapper && wrapper.classList.contains('marquee6k__wrapper')) {
            const original = wrapper.firstElementChild;
            element.innerHTML = '';
            if (original)
                element.appendChild(original);
        }
        element.classList.remove('is-init');
    }
    class marquee6k {
        element;
        selector;
        className;
        axis;
        direction;
        speed;
        pausable;
        tapPause;
        scrubbing;
        scrubDelayMs;
        scrubMomentum;
        reverse;
        paused;
        tapPaused;
        isHovering;
        isScrubbing;
        isPointerDown;
        pointerId;
        touchId;
        pointerStartX;
        pointerStartY;
        lastScrubAxis;
        lastScrubTime;
        lastScrubVelocity;
        momentumVelocity;
        momentumAnimId;
        lastMomentumTime;
        scrubStartOffset;
        pausedBeforeScrub;
        hasMoved;
        scrubResumeTimer;
        parent;
        parentProps;
        content;
        innerContent;
        wrapStyles;
        offset;
        wrapper;
        contentWidth;
        requiredReps;
        updateThrottleMs;
        lastUpdateTime;
        onInit;
        onUpdate;
        onPause;
        onPlay;
        initOptions;
        constructor(element, options) {
            if (element.children.length === 0) {
                throw new Error('Encountered a marquee element without children, please supply a wrapper for your content');
            }
            this.initOptions = { ...options };
            this.element = element;
            this.selector = options.selector || DEFAULT_SELECTOR;
            this.className = resolveClassName(options.selector, options.className);
            // Direction/axis/reverse: data-* overrides init defaults.
            const dataDirection = normalizeDirection(element.dataset.direction);
            const optionDirection = normalizeDirection(options.direction);
            const dataAxis = normalizeAxis(element.dataset.axis);
            const optionAxis = options.axis;
            const dataReverse = parseBoolean(element.dataset.reverse);
            const optionReverse = options.reverse ?? false;
            // Per-element data attributes override init options.
            if (dataDirection) {
                this.axis = directionToAxis(dataDirection);
                this.reverse = directionToReverse(dataDirection);
                this.direction = dataDirection;
            }
            else if (dataAxis) {
                this.axis = dataAxis;
                this.reverse = dataReverse ?? optionReverse;
                if (this.axis === 'y') {
                    this.direction = this.reverse ? 'down' : 'up';
                }
                else {
                    this.direction = this.reverse ? 'right' : 'left';
                }
            }
            else if (optionDirection) {
                this.axis = directionToAxis(optionDirection);
                this.reverse = directionToReverse(optionDirection);
                this.direction = optionDirection;
            }
            else {
                this.axis = optionAxis || 'x';
                this.reverse = dataReverse ?? optionReverse;
                if (this.axis === 'y') {
                    this.direction = this.reverse ? 'down' : 'up';
                }
                else {
                    this.direction = this.reverse ? 'right' : 'left';
                }
            }
            const dataSpeed = parseFloat(element.dataset.speed || '');
            this.speed = Number.isFinite(dataSpeed) ? dataSpeed : options.speed ?? DEFAULT_SPEED;
            const dataPausable = parseBoolean(element.dataset.pausable);
            this.pausable = dataPausable ?? options.pausable ?? false;
            const dataTapPause = parseBoolean(element.dataset.tapPause);
            const optionTapPause = options.tapPause;
            this.tapPause = dataTapPause ?? optionTapPause ?? false;
            const dataScrubbing = parseBooleanOrNumber(element.dataset.scrubbing);
            const optionScrubbing = options.scrubbing;
            const resolvedScrubbing = dataScrubbing ?? optionScrubbing ?? false;
            this.scrubbing = resolvedScrubbing !== false;
            this.scrubDelayMs = this.scrubbing
                ? typeof resolvedScrubbing === 'number'
                    ? Math.max(0, resolvedScrubbing)
                    : DEFAULT_SCRUB_DELAY
                : 0;
            const dataScrubMomentum = parseBoolean(element.dataset.scrubMomentum);
            this.scrubMomentum = dataScrubMomentum ?? options.scrubMomentum ?? false;
            this.paused = false;
            this.tapPaused = false;
            this.isHovering = false;
            this.isScrubbing = false;
            this.isPointerDown = false;
            this.pointerId = null;
            this.touchId = null;
            this.pointerStartX = 0;
            this.pointerStartY = 0;
            this.lastScrubAxis = 0;
            this.lastScrubTime = 0;
            this.lastScrubVelocity = 0;
            this.momentumVelocity = 0;
            this.momentumAnimId = undefined;
            this.lastMomentumTime = 0;
            this.scrubStartOffset = 0;
            this.pausedBeforeScrub = false;
            this.hasMoved = false;
            const parent = element.parentElement;
            if (!parent) {
                throw new Error('Encountered a marquee element without a parent. Please wrap it in a container.');
            }
            this.parent = parent;
            this.parentProps = this.parent.getBoundingClientRect();
            this.content = element.children[0];
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
            }
            else {
                this.wrapper.style.display = 'block';
            }
        }
        _setupContent() {
            this.content.classList.add(`${this.className}__copy`);
            this.content.style.display = this.axis === 'x' ? 'inline-block' : 'block';
        }
        _setupEvents() {
            // Clean up existing listeners to avoid duplicates on re-init.
            const existing = EVENT_HANDLERS.get(this.element);
            if (existing) {
                this.element.removeEventListener('mouseenter', existing.enter);
                this.element.removeEventListener('mouseleave', existing.leave);
                if (existing.pointerDown)
                    this.element.removeEventListener('pointerdown', existing.pointerDown);
                if (existing.pointerMove)
                    this.element.removeEventListener('pointermove', existing.pointerMove);
                if (existing.pointerUp)
                    this.element.removeEventListener('pointerup', existing.pointerUp);
                if (existing.pointerCancel)
                    this.element.removeEventListener('pointercancel', existing.pointerCancel);
                if (existing.mouseDown)
                    this.element.removeEventListener('mousedown', existing.mouseDown);
                if (existing.mouseMove)
                    window.removeEventListener('mousemove', existing.mouseMove);
                if (existing.mouseUp)
                    window.removeEventListener('mouseup', existing.mouseUp);
                if (existing.touchStart)
                    this.element.removeEventListener('touchstart', existing.touchStart);
                if (existing.touchMove)
                    this.element.removeEventListener('touchmove', existing.touchMove);
                if (existing.touchEnd)
                    this.element.removeEventListener('touchend', existing.touchEnd);
                if (existing.touchCancel)
                    this.element.removeEventListener('touchcancel', existing.touchCancel);
            }
            const enter = () => {
                this.isHovering = true;
                if (this.pausable && !this.tapPaused)
                    this.pause();
            };
            const leave = () => {
                this.isHovering = false;
                if (this.pausable && !this.tapPaused && !this.isScrubbing)
                    this.play();
            };
            const handlers = { enter, leave };
            const passiveOptions = { passive: true };
            const touchMoveOptions = { passive: false };
            this.element.addEventListener('mouseenter', enter);
            this.element.addEventListener('mouseleave', leave);
            const clearScrubResume = () => {
                if (this.scrubResumeTimer)
                    window.clearTimeout(this.scrubResumeTimer);
                this.scrubResumeTimer = undefined;
            };
            const scheduleScrubResume = () => {
                clearScrubResume();
                if (this.scrubDelayMs <= 0) {
                    if (!this.tapPaused && !(this.pausable && this.isHovering))
                        this.play();
                    return;
                }
                this.scrubResumeTimer = window.setTimeout(() => {
                    this.scrubResumeTimer = undefined;
                    if (!this.tapPaused && !(this.pausable && this.isHovering))
                        this.play();
                }, this.scrubDelayMs);
            };
            const startInteraction = (clientX, clientY) => {
                // Cancel momentum and reset scrub state for a new drag.
                this._stopMomentum();
                this.isPointerDown = true;
                this.pointerStartX = clientX;
                this.pointerStartY = clientY;
                this.scrubStartOffset = this.offset;
                this.hasMoved = false;
                this.isScrubbing = false;
                this.lastScrubAxis = 0;
                this.lastScrubTime = getNow();
                this.lastScrubVelocity = 0;
                this.momentumVelocity = 0;
                clearScrubResume();
            };
            const updateInteraction = (clientX, clientY, event) => {
                if (!this.isPointerDown)
                    return;
                const deltaX = clientX - this.pointerStartX;
                const deltaY = clientY - this.pointerStartY;
                const axisDelta = this.axis === 'x' ? deltaX : deltaY;
                const distance = Math.hypot(deltaX, deltaY);
                if (distance >= SCRUB_THRESHOLD)
                    this.hasMoved = true;
                if (this.scrubbing && !this.isScrubbing && Math.abs(axisDelta) >= SCRUB_THRESHOLD) {
                    this.isScrubbing = true;
                    this.pausedBeforeScrub = this.paused;
                    if (!this.paused)
                        this.pause();
                    this.element.classList.add('is-scrubbing');
                    this.lastScrubAxis = axisDelta;
                    this.lastScrubTime = getNow();
                }
                if (this.isScrubbing) {
                    if (event && 'preventDefault' in event && event.cancelable) {
                        event.preventDefault();
                    }
                    const now = getNow();
                    const dt = now - this.lastScrubTime;
                    if (dt > 0) {
                        const delta = axisDelta - this.lastScrubAxis;
                        if (Math.abs(delta) >= MOMENTUM_MIN_DELTA) {
                            let velocity = delta / dt;
                            velocity = Math.max(-MOMENTUM_MAX_VELOCITY, Math.min(MOMENTUM_MAX_VELOCITY, velocity));
                            this.lastScrubVelocity = velocity;
                            this.momentumVelocity = velocity;
                            this.lastScrubAxis = axisDelta;
                            this.lastScrubTime = now;
                        }
                    }
                    // Normalize offset so scrubbing never reveals empty gaps.
                    this.offset = this._normalizeOffset(this.scrubStartOffset + axisDelta);
                    this._applyTransform();
                }
            };
            const finishInteraction = (allowTapToggle) => {
                if (!this.isPointerDown)
                    return;
                this.isPointerDown = false;
                if (this.isScrubbing) {
                    this.isScrubbing = false;
                    this.element.classList.remove('is-scrubbing');
                    if (this.scrubMomentum && !this.tapPaused && !this.pausedBeforeScrub) {
                        this._startMomentum();
                        return;
                    }
                    if (!this.pausedBeforeScrub && !this.tapPaused && !(this.pausable && this.isHovering)) {
                        scheduleScrubResume();
                    }
                    return;
                }
                if (allowTapToggle && this.tapPause && !this.hasMoved) {
                    this.tapPaused = !this.tapPaused;
                    if (this.tapPaused) {
                        this.pause();
                    }
                    else if (!this.pausable || !this.isHovering) {
                        this.play();
                    }
                }
            };
            if (this.tapPause || this.scrubbing) {
                if ('PointerEvent' in window) {
                    // Pointer events cover mouse/touch/pen in modern browsers.
                    const pointerDown = (event) => {
                        if (event.button !== 0)
                            return;
                        if (this.pointerId !== null)
                            return;
                        this.pointerId = event.pointerId;
                        startInteraction(event.clientX, event.clientY);
                    };
                    const pointerMove = (event) => {
                        if (event.pointerId !== this.pointerId)
                            return;
                        updateInteraction(event.clientX, event.clientY, event);
                        if (this.isScrubbing) {
                            if (!this.element.hasPointerCapture?.(event.pointerId)) {
                                this.element.setPointerCapture?.(event.pointerId);
                            }
                        }
                    };
                    const pointerUp = (event) => {
                        if (event.pointerId !== this.pointerId)
                            return;
                        updateInteraction(event.clientX, event.clientY, event);
                        finishInteraction(true);
                        this.pointerId = null;
                        if (this.element.hasPointerCapture?.(event.pointerId)) {
                            this.element.releasePointerCapture?.(event.pointerId);
                        }
                    };
                    const pointerCancel = (event) => {
                        if (event.pointerId !== this.pointerId)
                            return;
                        updateInteraction(event.clientX, event.clientY, event);
                        finishInteraction(false);
                        this.pointerId = null;
                        if (this.element.hasPointerCapture?.(event.pointerId)) {
                            this.element.releasePointerCapture?.(event.pointerId);
                        }
                    };
                    handlers.pointerDown = pointerDown;
                    handlers.pointerMove = pointerMove;
                    handlers.pointerUp = pointerUp;
                    handlers.pointerCancel = pointerCancel;
                    this.element.addEventListener('pointerdown', pointerDown);
                    this.element.addEventListener('pointermove', pointerMove);
                    this.element.addEventListener('pointerup', pointerUp);
                    this.element.addEventListener('pointercancel', pointerCancel);
                }
                else {
                    // Fallback for older browsers without PointerEvent.
                    const mouseDown = (event) => {
                        if (event.button !== 0)
                            return;
                        startInteraction(event.clientX, event.clientY);
                        window.addEventListener('mousemove', mouseMove);
                        window.addEventListener('mouseup', mouseUp);
                    };
                    const mouseMove = (event) => {
                        updateInteraction(event.clientX, event.clientY, event);
                    };
                    const mouseUp = (event) => {
                        window.removeEventListener('mousemove', mouseMove);
                        window.removeEventListener('mouseup', mouseUp);
                        updateInteraction(event.clientX, event.clientY, event);
                        finishInteraction(true);
                    };
                    const touchStart = (event) => {
                        if (this.touchId !== null)
                            return;
                        const touch = event.changedTouches[0];
                        if (!touch)
                            return;
                        this.touchId = touch.identifier;
                        startInteraction(touch.clientX, touch.clientY);
                    };
                    const touchMove = (event) => {
                        const touch = Array.from(event.changedTouches).find((item) => item.identifier === this.touchId);
                        if (!touch)
                            return;
                        updateInteraction(touch.clientX, touch.clientY, event);
                    };
                    const touchEnd = (event) => {
                        const touch = Array.from(event.changedTouches).find((item) => item.identifier === this.touchId);
                        if (!touch)
                            return;
                        updateInteraction(touch.clientX, touch.clientY, event);
                        finishInteraction(true);
                        this.touchId = null;
                    };
                    const touchCancel = (event) => {
                        const touch = Array.from(event.changedTouches).find((item) => item.identifier === this.touchId);
                        if (!touch)
                            return;
                        updateInteraction(touch.clientX, touch.clientY, event);
                        finishInteraction(false);
                        this.touchId = null;
                    };
                    handlers.mouseDown = mouseDown;
                    handlers.mouseMove = mouseMove;
                    handlers.mouseUp = mouseUp;
                    handlers.touchStart = touchStart;
                    handlers.touchMove = touchMove;
                    handlers.touchEnd = touchEnd;
                    handlers.touchCancel = touchCancel;
                    this.element.addEventListener('mousedown', mouseDown);
                    this.element.addEventListener('touchstart', touchStart, passiveOptions);
                    this.element.addEventListener('touchmove', touchMove, touchMoveOptions);
                    this.element.addEventListener('touchend', touchEnd, passiveOptions);
                    this.element.addEventListener('touchcancel', touchCancel, passiveOptions);
                }
            }
            EVENT_HANDLERS.set(this.element, handlers);
        }
        _createClone() {
            const clone = this.content.cloneNode(true);
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
        _normalizeOffset(value) {
            // Keep offset within a single loop range to avoid blank space.
            if (!this.contentWidth)
                return value;
            const width = this.contentWidth;
            const normalized = ((value % width) + width) % width;
            return normalized - width;
        }
        _startMomentum() {
            // Apply decaying velocity after scrubbing ends.
            if (this.momentumAnimId)
                window.cancelAnimationFrame(this.momentumAnimId);
            const now = getNow();
            if (Math.abs(this.lastScrubVelocity) > Math.abs(this.momentumVelocity)) {
                this.momentumVelocity = this.lastScrubVelocity;
            }
            const dt = this.lastScrubTime > 0
                ? Math.max(16, Math.min(40, now - this.lastScrubTime))
                : 16.67;
            if (Math.abs(this.momentumVelocity) <= MOMENTUM_STOP) {
                this.momentumVelocity = 0;
                this.lastMomentumTime = now;
                if (!this.tapPaused && !(this.pausable && this.isHovering) && !this.pausedBeforeScrub) {
                    this.play();
                }
                return;
            }
            this.offset = this._normalizeOffset(this.offset + this.momentumVelocity * dt);
            this._applyTransform();
            this.lastMomentumTime = now;
            const step = (now) => {
                const dt = now - this.lastMomentumTime;
                this.lastMomentumTime = now;
                const decay = Math.pow(MOMENTUM_FRICTION, dt / 16.67);
                this.momentumVelocity *= decay;
                if (Math.abs(this.momentumVelocity) <= MOMENTUM_STOP) {
                    this.momentumVelocity = 0;
                    this.momentumAnimId = undefined;
                    if (!this.tapPaused && !(this.pausable && this.isHovering) && !this.pausedBeforeScrub) {
                        this.play();
                    }
                    return;
                }
                this.offset = this._normalizeOffset(this.offset + this.momentumVelocity * dt);
                this._applyTransform();
                this.momentumAnimId = window.requestAnimationFrame(step);
            };
            this.momentumAnimId = window.requestAnimationFrame(step);
        }
        _stopMomentum() {
            // Cancel any active momentum loop.
            if (this.momentumAnimId) {
                window.cancelAnimationFrame(this.momentumAnimId);
                this.momentumAnimId = undefined;
            }
            this.momentumVelocity = 0;
        }
        _applyTransform() {
            const translateX = this.axis === 'x' ? this.offset : 0;
            const translateY = this.axis === 'y' ? this.offset : 0;
            this.wrapper.style.transform = `translate(${translateX}px, ${translateY}px) translateZ(0)`;
        }
        animate() {
            if (!this.paused) {
                // Move content and loop seamlessly.
                const isScrolled = this.reverse ? this.offset < 0 : this.offset > this.contentWidth * -1;
                const direction = this.reverse ? -1 : 1;
                const reset = this.reverse ? this.contentWidth * -1 : 0;
                if (isScrolled)
                    this.offset -= this.speed * direction;
                else
                    this.offset = reset;
                this._applyTransform();
                if (this.onUpdate) {
                    // Throttle onUpdate to reduce callback overhead when desired.
                    const throttle = this.updateThrottleMs;
                    if (!throttle || throttle <= 0) {
                        this.onUpdate(this);
                    }
                    else {
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
        repopulate(difference, isLarger) {
            this._reflow();
        }
        static refresh(index) {
            MARQUEES[index]._refresh();
        }
        static pause(index) {
            MARQUEES[index].pause();
        }
        static play(index) {
            MARQUEES[index].play();
        }
        static toggle(index) {
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
        static reinit(index, options) {
            const instance = MARQUEES[index];
            if (!instance)
                return;
            instance.reinit(options);
        }
        static reinitElement(element, options) {
            const index = MARQUEES.findIndex((instance) => instance.element === element);
            if (index < 0)
                return;
            MARQUEES[index].reinit(options);
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
            if (this.paused)
                this.play();
            else
                this.pause();
        }
        reinit(options) {
            if (this.scrubResumeTimer) {
                window.clearTimeout(this.scrubResumeTimer);
                this.scrubResumeTimer = undefined;
            }
            this._stopMomentum();
            const mergedOptions = options ? { ...this.initOptions, ...options } : this.initOptions;
            prepareElement(this.element);
            const instance = new marquee6k(this.element, mergedOptions);
            const index = MARQUEES.indexOf(this);
            if (index >= 0) {
                MARQUEES[index] = instance;
            }
            else {
                MARQUEES.push(instance);
            }
        }
        static init(options = {}) {
            if (animationId)
                window.cancelAnimationFrame(animationId);
            if (resizeHandler)
                window.removeEventListener('resize', resizeHandler);
            if (resizeTimer)
                window.clearTimeout(resizeTimer);
            MARQUEES = [];
            window.MARQUEES = MARQUEES;
            const selector = normalizeSelector(options.selector);
            const marquees = Array.from(document.querySelectorAll(selector));
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
                if (resizeTimer)
                    window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => {
                    for (let i = 0; i < MARQUEES.length; i++) {
                        MARQUEES[i]._refresh();
                    }
                }, 250);
            };
            window.addEventListener('resize', resizeHandler);
        }
    }

    return marquee6k;

}));
//# sourceMappingURL=marquee6k.js.map

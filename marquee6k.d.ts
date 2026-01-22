/**
 * marquee6k
 * http://github.com/SPACESODA/marquee6k
 * MIT License
 */
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
declare global {
    interface Window {
        MARQUEES: marquee6k[];
    }
}
declare class marquee6k {
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
    wrapper: HTMLElement;
    contentWidth: number;
    requiredReps: number;
    updateThrottleMs?: number;
    lastUpdateTime: number;
    onInit?: (instance: marquee6k) => void;
    onUpdate?: (instance: marquee6k) => void;
    onPause?: (instance: marquee6k) => void;
    onPlay?: (instance: marquee6k) => void;
    constructor(element: HTMLElement, options: MarqueeOptions);
    _setupWrapper(): void;
    _setupContent(): void;
    _setupEvents(): void;
    _createClone(): void;
    _getContentSize(): number;
    _getParentSize(): number;
    _reflow(): void;
    animate(): void;
    _refresh(): void;
    repopulate(difference: number, isLarger: boolean): void;
    static refresh(index: number): void;
    static pause(index: number): void;
    static play(index: number): void;
    static toggle(index: number): void;
    static refreshAll(): void;
    static pauseAll(): void;
    static playAll(): void;
    static toggleAll(): void;
    pause(): void;
    play(): void;
    toggle(): void;
    static init(options?: MarqueeOptions): void;
}
export default marquee6k;

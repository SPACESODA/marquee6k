# marquee6k

**marquee6k** is a super smooth, lightweight vanilla JavaScript marquee library.  
No dependencies. Powerful and high-performance.  
It is the best marquee library out there.  
Marquees forever ✨✨✨

<br>

## Initialize

`marquee6k.init()`

<br>

## Features
- No dependencies
- Turn any element into a smooth-as-butter marquee
- Style marquees as usual with CSS
- Set speed and direction (left/right/up/down)
- Responsive, tap-to-pause, and drag-scrubbing
- Access Marquee instances globally
- Have a ton without any slowdown!

<br>

## Usage

1. Include marquee6k in your HTML file.
   
   Place it before the closing `</body>` tag. Initialize marquee6k AFTER images or custom fonts have been loaded.
   
   Via CDN ([jsDelivr](https://www.jsdelivr.com/package/gh/SPACESODA/marquee6k)), latest version:

    ```html
    <script src="https://cdn.jsdelivr.net/gh/SPACESODA/marquee6k@latest/marquee6k.min.js"></script>
    <script>marquee6k.init();</script>
    ```

    If the marquee's content or styling depends on images or webfonts (anything that can change its size after load), you can initialize on `load` to ensure measurements are correct:

    ```html
    <script src="https://cdn.jsdelivr.net/gh/SPACESODA/marquee6k@latest/marquee6k.min.js"></script>
    <script>window.addEventListener('load', () => marquee6k.init());</script>
    ```
   
   Via [npm](https://www.npmjs.com/package/marquee6k) (bundler):

    ```bash
    npm install marquee6k
    ```

    ```javascript
    const marquee6k = require('marquee6k');
    // or
    import marquee6k from 'marquee6k';
    ```

   Local file:

    ```html
    <script src="marquee6k.js"></script>
    <script>marquee6k.init();</script>
    ```

2. Create an element with a `.marquee6k` class.
   
   You can pass options via data attributes such as speed, reverse, pausable, tap-pause, scrubbing, scrub-momentum, direction, and axis. See the **Data attributes per element** section for more options.

    ```html
    <div class="marquee6k"
        data-speed="0.5"
        data-pausable="true">
        <!-- Inline images, text, or any HTML -->
        <h1>Some marquee content</h1>
    </div>
    ```
    
    Add your content (text, images, or any inline HTML).

3. Use CSS for spacing and styling. The script adds a `${className}__copy` class to each repeated segment (default is `.marquee6k__copy`). This class name pattern is part of the public API, so use it as-is when styling.
   
    ```css
    /* Example: Optional wrapper to rotate/transform the whole marquee */
    .diagonal-marquee {
        transform: rotate(45deg);
    }

    /* Each repeated segment uses `${className}__copy` (default: .marquee6k__copy) */
    .marquee6k__copy {
        padding-right: 30px;
        box-sizing: border-box;
    }
    ```

### Options

`init()` accepts the following options (all are optional):

```javascript
marquee6k.init({
    selector: 'selector-name', // class name or CSS selector
    className: 'marquee6k', // base class for __copy (optional)
    speed: 0.25,
    pausable: false,
    tapPause: false,
    scrubbing: 600,
    scrubMomentum: false,
    reverse: false,
    axis: 'x', // 'x' | 'y'
    direction: 'left', // 'left' | 'right' | 'up' | 'down'
    onInit: (instance) => {},
    onUpdate: (instance) => {},
    onPause: (instance) => {},
    onPlay: (instance) => {},
    onUpdateThrottle: 200, // ms
});
```

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `selector` | string | `marquee6k` | Class name or full CSS selector |
| `className` | string | derived | Base class for `${className}__copy` (defaults to last class in `selector` or `marquee6k`) |
| `speed` | number | `0.25` | Pixels per frame |
| `pausable` | boolean | `false` | Pause on hover |
| `tapPause` | boolean | `false` | Tap/click toggles pause; hover (`pausable` / `data-pausable`) never resumes a tap-paused marquee |
| `scrubbing` | boolean or number | `false` | Drag to scrub; `true` uses a 250ms resume delay, or pass a delay in ms |
| `scrubMomentum` | boolean | `false` | Keep moving after scrubbing with decaying momentum |
| `reverse` | boolean | `false` | Ignored if `direction` is set |
| `axis` | `x` / `y` | `x` | Ignored if `direction` is set |
| `direction` | `left` / `right` / `up` / `down` | `left` | Explicit direction; takes precedence over `axis` and `reverse` |
| `onInit` | function | — | Called after a marquee initializes |
| `onUpdate` | function | — | Called on animation frames (see `onUpdateThrottle`) |
| `onPause` | function | — | Called when a marquee is paused |
| `onPlay` | function | — | Called when a marquee resumes |
| `onUpdateThrottle` | number (ms) | — | Throttles `onUpdate` calls |

#### Scrubbing

Scrubbing begins after ~10px of movement along the marquee axis. Release resumes after the delay unless tap-paused (or still hovering when `pausable` is true).

If `scrubMomentum` is enabled, the marquee keeps moving briefly after release. While scrubbing, the marquee adds an `is-scrubbing` class; you can use it to disable text selection if needed.

### Selector

The default selector is `marquee6k`, so `marquee6k.init()` looks for `.marquee6k` elements. You can also pass a full CSS selector (e.g. `#section .marquee`, `.box[data-brands="marquee"]`), more examples below. If your selector is not a simple class, set `className` to control the `${className}__copy` class used for styling.

| Selector example | Notes |
| --- | --- |
| `class-name` | bare class name (auto-prefixed to `.class-name`) |
| `.class-name` | explicit class selector |
| `.box.box-a` | compound class selector |
| `.box .box-sub` | descendant selector |
| `#section .marquee` | id + class |
| `.box [data-brands]` | attribute selector |
| `.box [data-brands="marquee"]` | attribute value selector |
| `div.box .marquee` | element + class selector |

Note: a bare element tag like `div` is treated as a class and becomes `.div`. If you need to target elements, include a full selector like `div.marquee6k` or use an attribute selector.

### Data attributes per element

Per-element data attributes override init options.

These are read from each marquee element's `data-*` attributes:

| Attribute | Values | Default | Notes |
| --- | --- | --- | --- |
| `data-direction` | `left` / `right` / `up` / `down` | `left` | Explicit direction; takes precedence over `data-axis` and `data-reverse` |
| `data-axis` | `x` / `y` | `x` | Axis alias, ignored if `data-direction` is set |
| `data-reverse` | `true` / `false` | `false` | Ignored if `data-direction` is set |
| `data-speed` | number | `0.25` | Pixels per frame |
| `data-pausable` | `true` / `false` | `false` | Pause on hover |
| `data-tap-pause` | `true` / `false` | `false` | Tap/click toggles pause; hover  (by `pausable` / `data-pausable`) never resumes a tap-paused marquee |
| `data-scrubbing` | `true` / number | `false` | Drag to scrub; `true` uses a 250ms resume delay, or pass a delay in ms |
| `data-scrub-momentum` | `true` / `false` | `false` | Keep moving after scrubbing with decaying momentum |

#### data-direction vs data-axis

`data-direction` is explicit; `data-axis` is a shorthand for orientation and works with `data-reverse` to determine direction:

- `x` + `data-reverse="false"` → left
- `x` + `data-reverse="true"` → right
- `y` + `data-reverse="false"` → up
- `y` + `data-reverse="true"` → down

Order of precedence (highest → lowest): `data-direction`, `data-axis` (and `data-reverse` if provided), init `direction`, init `axis`/`reverse`.

#### Vertical marquee example

For vertical marquees, set a fixed height and `overflow: hidden` on the parent container in your CSS (the script does not set this for you).

```css
.marquee-vertical {
    height: 160px;
    overflow: hidden;
}
```

```html
<div class="marquee-vertical">
    <div class="marquee6k"
        data-speed="0.15"
        data-direction="up">
        <h1>Some marquee content</h1>
    </div>
</div>
```

### is-init class (ready state)

Each marquee element gets an `is-init` class after it finishes initializing. Use it as a hook for entrance transitions or ready-state styling.

```css
.marquee6k {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 300ms ease, transform 300ms ease;
}

.marquee6k.is-init {
    opacity: 1;
    transform: translateY(0);
}
```

<br>

## Controls

### Play

You can start the animation after being paused by:

```javascript
// Play all instances
marquee6k.playAll();

// or target a specific instance
marquee6k.play(index); // index of marquee
```

### Pause

You can stop the animation by:

```javascript
// Pause all instances
marquee6k.pauseAll();

// or target a specific instance
marquee6k.pause(index); // index of marquee
```

### Toggle

You can toggle the animation by:

```javascript
// Toggle all instances
marquee6k.toggleAll();

// or target a specific instance
marquee6k.toggle(index); // index of marquee
```

### Refresh

You can refresh (if width of the inner content changes dynamically) by:

```javascript
// Refresh all instances
marquee6k.refreshAll();

// or, since all marquees are available globally, target a specific instance
marquee6k.refresh(index); // index of marquee
```

Refresh will rebuild clones and reset the position, so it is safe to call after content or layout changes.

### Re-init all

To re-initialize all instances (full rebuild), call `marquee6k.init()` again with the same options.

### Re-init (single instance)

If the inner markup is replaced and a refresh does not rebuild the structure, re-initialize a single marquee:

```javascript
marquee6k.reinit(index); // rebuilds one instance using its original init options
```

You can also re-init by element reference:

```javascript
marquee6k.reinitElement(document.querySelector('.marquee6k'));
```

Re-init removes the old wrapper, rebuilds clones, and rebinds events for that element only.

<br>

## Build

The source of truth is `src/marquee6k.ts`. Build outputs are generated so the same code works both via a plain `<script>` tag (UMD) and via `import` (ESM), without maintaining two separate implementations.

```bash
npm install
npm run build
```

<br>

## Questions

**Q: But it's slow, I have 150+ of them on the same page**

A: If you've got literally hundreds of them on one page, you've got
a marquee addiction problem.

**Q: Does it work on mobile?**

A: Yes it does and it works quite well! If you're going to be rotating
things and all that fancy stuff, just make sure to style it with CSS.

**Q: Can i make a marquee that's position fixed?**

A: Absolutely. You just have to wrap the marquee element inside another
container which gets the `position: fixed`.

**Q: Do callbacks exist?**

A: Yes. Pass `onInit`, `onUpdate`, `onPause`, or `onPlay` into `marquee6k.init({ ... })`.

<br>

## Credits

This project is a fork of the popular (but long unmaintained) [Marquee3000](https://github.com/ezekielaquino/Marquee3000). If 3000 is a millennium, I guess 6000 is forever. Don't ask me why.

The **marquee6k** codebase has been fully modernized with TypeScript, squashed lingering bugs, and polished it up for the modern web. Same butter-smooth performance, just future-proofed.

<br>

## License

This project is licensed under the MIT License.

# marquee6000

Marquees forever ✨

Super smooth and versatile javaScript plugin with no dependencies.

# Initialize

`marquee6k.init()`

## Features
- ~3kb minified with no dependencies
- Turn any element into a smooth-as-butter marquee
- Text, images++<sup>*</sup> it'll do it
- Style marquees as usual with CSS– get creative!
- Set speed and direction
- Have a ton without any slowdown
- Responsive!
- Access Marquee instances globally

## Usage

1. Include marquee6000 in your html file.  
   Download zip or install via `npm install marquee6000`

    ```javascript
        const marquee6k = require('marquee6000');
        // or
        import marquee6k from 'marquee6000';
    ```

    ```html
        <script src="marquee6k.js"></script>
     ```
        
2. Create an element with a `.marquee6k` class.  
   You can pass different options such as speed, orientation and direction (optional). See below for options.

    ```html
        <div class="marquee6k" 
            data-speed="0.25" → play around here
            data-reverse="bool" → default: R to L / T to B
            data-pausable="bool" → Pause marquee on hover>
            <!--you can even have inline images, or any kind of html -->
            <h1>Some marquee content</h1>
        </div>
    ```
        
3. Fill it up with text or images etc. (still finding out what you can do with it)

4. In your js file or `<script>` just call `marquee6k.init()` and you're all set!

5. To set spacing and other wonderful things, please use css (each repeated segment gets a `${selector}__copy` class – default is `marquee6k__copy`; the `diagonal-marquee` wrapper below is just an example, not required)

    ```css
        /* Example: Optional wrapper to rotate/transform the whole marquee */
        .diagonal-marquee {
            transform: rotate(45deg);
        }

        /* Each repeated segment uses `${selector}__copy` (default: .marquee6k__copy) */
        .marquee6k__copy {
            padding-right: 30px;
            box-sizing: border-box;
        }
    ```

### New stuff

#### Refresh

You can refresh (if width of the inner content changes dynamically) by:

```javascript
    // Refresh all instances
    marquee6k.refreshAll();

    // or, since all marquees are available
    // globally, target a specific instance
    marquee6k.refresh(index); // index of marquee
```
    
#### Pause

You can stop the animation by:

```javascript
    // Refresh all instances
    marquee6k.pauseAll();

    // or target a specific instance
    marquee6k.pause(index); // index of marquee
```

#### Play

You can start the animation after being paused by:

```javascript
    // Refresh all instances
    marquee6k.playAll();

    // or target a specific instance
    marquee6k.play(index); // index of marquee
```

#### Toggle

You can toggle the animation by:

```javascript
    // Refresh all instances
    marquee6k.toggleAll();

    // or target a specific instance
    marquee6k.toggle(index); // index of marquee
```

### Important

If you are using images or custom fonts, initialise marquee6000 AFTER they have been loaded!

### Options

You can set additional configuration options.

```javascript
    marquee6k.init({
        selector: '.selector-name', // define a custom classname
    });
```

Marquee also adds a `is-init` selector. You can use this to add and toggle entrance transitions, for example.

### Build

The source of truth is `src/marquee6k.js`. Run the build to generate both `marquee6k.js` (UMD) and `marquee6k.esm.js` (ESM):

```bash
npm run build
```

### Questions

**Q: But it's slow, I have 150+ of them on the same page**

A: If you've got literally hundreds of them on one page, you've got
a marquee addiction problem.

**Q: Does it work on mobile?**

A: Yes it does and it works quite well! If you're going to be rotating
things and all that fancy stuff, just make sure to style it with CSS.

**Q: Can i make a marquee that's position fixed?**

A: Absolutely. You just have to wrap the marquee element inside another
container which gets the `position: fixed`.

**Q: the callback does not work?**

A: You have to pass in only the name of the function (must be defined in global scope). Still currently a very basic implementation. Suggestions welcome!

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

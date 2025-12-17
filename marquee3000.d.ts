interface Options {
  selector: string
}

declare class marquee6k {
  constructor(element: HTMLElement, options: Options)
  animate(): void
  repopulate(difference: number, isLarger: boolean): void
  static refresh(index: number): void
  static pause(index: number): void
  static play(index: number): void
  static toggle(index: number): void
  static refreshAll(): void
  static playAll(): void
  static toggleAll(): void
  static init(options?: Options): void
}

declare module 'marquee6000' {
  export = marquee6k
}

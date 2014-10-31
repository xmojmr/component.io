class Range {
  private _minFontSize: number;
  private _maxFontSize: number;
  private _minValue: number;
  private _maxValue: number;

  constructor(minFontSize: number, maxFontSize: number, minValue: number, maxValue: number) {
    this._minFontSize = minFontSize;
    this._maxFontSize = maxFontSize;
    this._minValue = minValue;
    this._maxValue = maxValue;
  }

  includes(w: number): boolean {
    return w >= this._minValue && w <= this._maxValue;
  }

  getSize(w: number): number {
    if (w == this._minValue)
      return this._minFontSize;

    return ((Math.log(w - this._minValue + 1) / Math.log(this._maxValue - this._minValue + 1)) * (this._maxFontSize - this._minFontSize)) + this._minFontSize;
  }
}

export = Range;

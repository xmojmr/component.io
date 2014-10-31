/// <reference path="../../../templates/vendor/borisyankov/DefinitelyTyped/jquery/jquery.d.ts" />

declare function escapeHtml(html: string): string;
declare var $: JQueryStatic;
declare var modal: any; /* TODO: strong-type it */

import Range = require("./Range");

interface ICloudItem {
  key: string;
  weight: number;
  count: number;
}

class Cloud {
  static hash(t: string): string {
    return t.toLowerCase();
  }

  static SEPARATOR = ';'; // TODO: use some distinct character that certainly is not present in the hash code

  private _className: string;
  private _htmlJoinOperator: string;
  private _weights: {
    [key: string]: number
  };
  private _counts: {
    [key: string]: number
  };
  private _properties: {
    [key: string]: {
      [key: string]: string
    }
  };
  private _items: ICloudItem[];
  private _minWeight: number;
  private _maxWeight: number;
  private _filteredHashes: {
    [hash: string]: boolean
  };
  private _filteredArray: string[];
  /* TODO: protected */ _filteredHashedArray: string[];
  private _cloudHtml: string;
  private _fontSizeRanges: number[];
  private _visible: boolean;
  private _anyValueText: string;

  constructor(className: string, htmlJoinOperator: string, fontSizeRanges: number[], anyValueText: string) {
    this._className = className;
    this._htmlJoinOperator = htmlJoinOperator;
    this._anyValueText = anyValueText;
    this._weights = {};
    this._counts = {};
    this._properties = {};
    this._items = [];
    this._minWeight = 0;
    this._maxWeight = 0;
    this._filteredHashes = {};
    this._filteredArray = [];
    this._filteredHashedArray = [];
    this._cloudHtml = null;
    this._fontSizeRanges = fontSizeRanges;
    this._visible = false;
  }

  /**
   * registers key in the cloud. Returns true if the key was
   * newly added
   */
  add(key: string, weight?: number): boolean {
    var oldWeight = this._weights[key];
    if (oldWeight == null) {
      this._weights[key] = weight || 0;
      this._counts[key] = 1;
      return true;
    } else {
      this._weights[key] = oldWeight + (weight || 0);
      this._counts[key] = this._counts[key] + 1;
      return false;
    }
  }

  set(key: string, propertyName: string, propertyValue: string): void {
    var bag = this._properties[key] || {};
    if (propertyValue == null)
      delete bag[propertyName];
    else
      bag[propertyName] = propertyValue;
    this._properties[key] = bag;
  }

  get(key: string, propertyName: string): string {
    var bag = this._properties[key];
    if (bag == null)
      return null;
    return bag[propertyName];
  }

  private _sort(): void {
    if (this._items.length > 0)
      // already sorted
      return;

    this._items = [];

    var minWeight = 100000 /* any 'maxint' */;
    var maxWeight = -minWeight;

    for (var key in this._weights) {
      var weight = this._weights[key];
      var count = this._counts[key];
      var w = weight + count;
      if (w > maxWeight)
        maxWeight = w;
      if (w < minWeight)
        minWeight = w;
      this._items.push({ key: key, weight: weight, count: count });
    }

    if (minWeight > maxWeight)
      minWeight = maxWeight;

    this._minWeight = minWeight;
    this._maxWeight = maxWeight;

    this._items.sort(function (a: ICloudItem, b: ICloudItem): number {
      return a.key.localeCompare(b.key);
    });
  }

  /* TODO: protected virtual */ _getText(t: string, size?: number): string {
    return escapeHtml(t);
  }

  createHtml(t: string, attributes?: string, size?: number): string {
    var active = '';
    var hash = Cloud.hash(t);
    if (this._filteredHashes[hash])
      active = ' active';
    return '<span class="' + this._className + active + '" onclick="' + this._className + 'Click(this)"' + (attributes || '') + ' data-hash="' + hash + '" data-' + this._className + '="' + t + '">' + this._getText(t, size) + '</span>';
  }

  /* TODO: protected virtual */ _createCloudHtml(fontSizeRanges?: number[]): string {
    this._sort();

    var ranges: Range[] = [];
    var getRange: (w: number) => Range = null;

    switch ((fontSizeRanges || [1]).length) {
      case 1:
        ranges.push(new Range(
          fontSizeRanges[0],
          fontSizeRanges[0],
          this._minWeight,
          this._maxWeight
          ));
        getRange = function (w) { return ranges[0]; };
        break;

      case 2:
        ranges.push(new Range(
          fontSizeRanges[0],
          fontSizeRanges[1],
          this._minWeight,
          this._maxWeight
          ));
        getRange = function (w) { return ranges[0]; };
        break;

      case 3:
        ranges.push(new Range(
          fontSizeRanges[0],
          fontSizeRanges[1],
          this._minWeight,
          0
          ));
        ranges.push(new Range(
          fontSizeRanges[1],
          fontSizeRanges[2],
          0,
          this._maxWeight
          ));
        getRange = function (w) {
          return (ranges[1].includes(w)) ? ranges[1] : ranges[0];
        };
        break;

      default:
        throw Error("Not supported number of ranges");
    }

    var fontSizes: {
      [size: number]: number
    } = {};
    var fontSizeStyles: {
      [size: number]: string
    } = {};

    var weightBase = this._minWeight - 1;
    var logBase = Math.log((this._maxWeight - weightBase) / 10 /* TODO: TUNE: */);
    var logMax = Math.log(this._maxWeight - weightBase) / logBase;

    return this._items.map(
      (t: ICloudItem) => {
        var w = t.weight + t.count;

        var fontSize = fontSizes[w];
        var fontSizeStyle: string;

        if (fontSize == null) {
          fontSize = getRange(w).getSize(w);

          fontSizes[w] = fontSize;

          fontSizeStyle = ' style="font-size:' + parseFloat(fontSize.toFixed(3)).toString() + 'em;"';
          fontSizeStyles[w] = fontSizeStyle;
        } else {
          fontSizeStyle = fontSizeStyles[w];
        }

        var title = '';
        if (t.weight != 0 && t.weight != t.count) {
          title = ' title="x ' + t.count.toString() + ' = ' + t.weight.toString() + '"';
        } else {
          title = ' title="x ' + t.count.toString() + '"';
        }
        return this.createHtml(t.key, fontSizeStyle + title, fontSize);
      }
      , this).join("");
  }

  createCloudHtml(): string {
    if (this._cloudHtml == null)
      this._cloudHtml = this._createCloudHtml(this._fontSizeRanges);

    return this._cloudHtml;
  }

  getControllerButtonControl(): JQuery {
    return $('#' + this._className + 's-controller a.ui-button');
  }

  getCloudControl(): JQuery {
    return $('#' + this._className + 's');
  }

  isFilterEmpty(): boolean {
    return this._filteredHashedArray.length == 0;
  }

  isMatch(hashes: string): boolean {
    // row is accepted only if it contains ALL tags
    for (var i = this._filteredHashedArray.length - 1; i >= 0; i--) {
      if (hashes.indexOf(this._filteredHashedArray[i]) < 0)
        return false;
    }
    return true;
  }

  getFilteredArray(): string[] {
    return this._filteredArray;
  }

  toggle(key: string, hash?: string): void {
    var tagHash = Cloud.hash;
    var SEPARATOR = Cloud.SEPARATOR;

    if (hash == null)
      hash = tagHash(key);

    if (this._filteredHashes[hash]) {
      delete this._filteredHashes[hash];
      $('.' + this._className).filter('[data-hash="' + hash + '"]').removeClass('active');
      this._filteredArray = this._filteredArray.filter(function (t) { return tagHash(t) != hash; });
    } else {
      this._filteredHashes[hash] = true;
      $('.' + this._className).filter('[data-hash="' + hash + '"]').addClass('active');
      this._filteredArray.push(key);
    }

    // show selected tags to the user
    this._filteredArray.sort(function (a: string, b: string): number {
      return a.localeCompare(b);
    });

    // Invalidate cloud html cache
    this._cloudHtml = null;

    this._draw();

    this._filteredHashedArray = this._filteredArray.map(function (t) { return SEPARATOR + tagHash(t) + SEPARATOR; });
  }

  /* TODO: protected */ _draw(): void {
    var container = $('#' + this._className + '-filter');

    switch (this._filteredArray.length) {
      case 0:
        container.html(this._anyValueText);
        break;

      case 1:
        container.html(this._filteredArray.map((value) => this.createHtml(value)).join(this._htmlJoinOperator));
        break;

      default:
        container.html("(" + this._filteredArray.map((value) => this.createHtml(value)).join(this._htmlJoinOperator) + ")");
        break;
    }
  }

  private _normalize(value: string): string {
    return value;
  }

  activate(filter: string): void;
  activate(filter: string[]): void;
  activate(aFilter: any): void {
    var filter: string[];

    if (aFilter == null)
      filter = [];
    else if (aFilter instanceof Array)
      filter = aFilter;
    else
      filter = [aFilter];

    // turn-off all previous tag filters
    while (this._filteredArray.length > 0)
      this.toggle(this._filteredArray[0]);

    for (var i = 0; i < filter.length; i++)
      this.toggle(this._normalize(filter[i]));
  }

  display(visible?: boolean): void {
    if (visible == null)
      visible = !this._visible;

    if (visible == this._visible)
      return;

    this._visible = visible;

    if (this._visible) {
      this.getControllerButtonControl().addClass('ui-state-active');

      modal.open({
        content: this.createCloudHtml(),
        width: '95%',
        height: '95%',
        onClose: () => this.display(false)
      });
    } else {
      this.getControllerButtonControl().removeClass('ui-state-active');

      modal.close();
    }
  }
}

export = Cloud;

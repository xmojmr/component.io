import Cloud = require("./Cloud");

class Avatars extends Cloud {
  static PROPERTY_GRAVATAR = 'g';

  private _fallbackImageSize: string;
  private _useImages: boolean;

  constructor(fallbackImageSize: number, fontSizeRanges: number[], anyValueText: string);
  constructor(fallbackImageSize: string, fontSizeRanges: number[], anyValueText: string);
  constructor(fallbackImageSize: any, fontSizeRanges: number[], anyValueText: string) {
    super('avatar', ' &#8744; ', fontSizeRanges, anyValueText);
    this._fallbackImageSize = fallbackImageSize.toString();
    this._useImages = true;
  }

  isMatch(hashes: string): boolean {
    // row is accepted only if it contains ANY of the avatar hashes
    for (var i = this._filteredHashedArray.length - 1; i >= 0; i--) {
      if (hashes.indexOf(this._filteredHashedArray[i]) >= 0)
        return true;
    }
    return false;
  }

  useImages(value: boolean): void {
    if (this._useImages != value) {
      this._useImages = value;
      this._draw();
    }
  }

  /* TODO: protected override */ _getText(t: string, size?: number): string {
    return this.createImageHtml(t, size) + super._getText(t, size);
  }

  createImageHtml(key: string, aSize?: number): string {
    if (!this._useImages)
      return '';

    var gravatar = this.get(key, Avatars.PROPERTY_GRAVATAR);
    if (gravatar != null) {
      var size: string;

      if (aSize == null || isNaN(aSize)) {
        size = this._fallbackImageSize;
      } else {
        // http://pxtoem.com/
        size = Math.round(aSize * 16 /* em_to_px */ * 1.2 /* magic scale factor saying how much is image bigger than text of the same importance */).toString();
      }
      gravatar = 'http://www.gravatar.com/avatar/' + gravatar + '.png?s=' + size;
      gravatar = '<img src="' + gravatar + '" width="' + size + '" height="' + size + '" alt="' + key + '">';
    } else {
      gravatar = '';
    }
    return gravatar;
  }

  /* TODO: protected override */ _createCloudHtml(fontSizeRanges?: number[]): string {
    var oldUseImages = this._useImages;
    this._useImages = true;
    try {
      return super._createCloudHtml(fontSizeRanges);
    } finally {
      this._useImages = oldUseImages;
    }
  }
}

export = Avatars;

import Cloud = require("./Cloud");

class Tags extends Cloud {
  constructor(fontSizeRanges: number[], anyValueText: string) {
    super('tag', ' &#8743; ', fontSizeRanges, anyValueText);
  }
}

export = Tags;
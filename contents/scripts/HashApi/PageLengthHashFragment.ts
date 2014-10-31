/// <reference path="../typings/IDataTableEx.d.ts" />

class PageLengthHashFragment {
  private _table: IDataTableEx;
  private DEFAULT_PAGE_LENGTH: number;

  constructor(table: IDataTableEx, defaultPageLength: number) {
    this._table = table;
    this.DEFAULT_PAGE_LENGTH = defaultPageLength;
  }

  private _getValidPageLengths(): number[] {
    return this._table.settings()[0].aLengthMenu[0];
  }

  private _getPageLengthNames(): any[] {
    return this._table.settings()[0].aLengthMenu[1];
  }

  decode(hash: string): number {
    var names = this._getPageLengthNames();
    for (var i = 0; i < names.length; i++)
      if (hash.toLowerCase() == names[i].toString().toLowerCase())
        return this._getValidPageLengths()[i];
    return this.DEFAULT_PAGE_LENGTH;
  }

  encode(pageLengthParam: number): string {
    if (pageLengthParam == this.DEFAULT_PAGE_LENGTH)
      return '';
    var values = this._getValidPageLengths();
    for (var i = 0; i < values.length; i++)
      if (values[i] == pageLengthParam)
        return this._getPageLengthNames()[i].toString().toLowerCase();
    return '';
  }
}

export = PageLengthHashFragment; 
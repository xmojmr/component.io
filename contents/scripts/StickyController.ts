/// <reference path="../../templates/vendor/borisyankov/DefinitelyTyped/jquery/jquery.d.ts" />

declare var $: JQueryStatic;

import PartId = require("./PartId");

interface IStickyDataTable {
  stickyTableHeaders(options: {
    fixedOffset: JQuery;
    leftOffset: number;
  }): void;
  stickyTableHeaders(event: string): void;
}

interface IFixedScrollHeader {
  stick_in_parent(options: {
    offset_top: number;
    width_calculator?: (element: JQuery) => number;
    padding_width?: number;
  }): void;
}

class StickyController {
  private _fixedParts: number;
  private _pageFilterOffset: number;
  private _isEnabled: boolean;
  private _tableId: string;

  constructor(tableId: string) {
    this._fixedParts = 0;
    this._pageFilterOffset = 0;
    this._isEnabled = true;
    this._tableId = tableId;
    $(window).scroll(() => this._windowScrollChanged());
  }

  isEnabled(value?: boolean): boolean {
    if (value != null)
      if (value != this._isEnabled)
        if (value) {
          this._isEnabled = true;
        } else {
          this.unlock();
          this._isEnabled = false;
        }
    return this._isEnabled;
  }

  private _getPageFilterWidthPadding(): number {
    return parseInt($("#content").css('paddingLeft'));
  }

  private _getPageFilterWidth(element: JQuery): number {
    return $('#content').outerWidth();
  }

  private _getPageFilterHeightPadding(): number {
    return parseInt($('#fixed-scroll-header').css('paddingTop'));
  }

  private _windowScrollChanged(): void {
    if (this._isFixed(PartId.PAGE_FILTER)) {
      // Let the interior of the filter row respond to horizontal window scrollbar changes
      $('#fixed-scroll-header .scroll-header').css({
        left: (-$(document).scrollLeft() + this._getPageFilterWidthPadding()).toString() + 'px'
      });
    }
  }

  private _isFixed(partId: PartId): boolean {
    return (this._fixedParts & partId) != 0;
  }

  private _isActive(partId: PartId): boolean {
    if (!this._isEnabled)
      return false;

    switch (partId) {
      case PartId.TABLE_HEADER:
        return $(this._tableId + ' thead.tableFloatingHeaderOriginal').css('position') == 'fixed';

      case PartId.PAGE_FILTER:
        return $('#fixed-scroll-header').hasClass('is_stuck');

      default:
        throw new Error("Not implemented");
    }
  }

  private _getPartIds(partIds: PartId[]): PartId[];
  private _getPartIds(partId?: PartId): PartId[];
  private _getPartIds(partIds: any): PartId[] {
    if (partIds instanceof Array)
      return partIds;
    if (partIds == null)
      return [
        PartId.PAGE_FILTER,
        PartId.TABLE_HEADER
      ];
    return [partIds];
  }

  lock(partIds: PartId[]): void;
  lock(partId?: PartId): void;
  lock(aPartIds: any): void {
    if (!this._isEnabled)
      return;

    var partIds = this._getPartIds(aPartIds);

    for (var i = 0; i < partIds.length; i++) {
      var partId = partIds[i];

      if (!this._isFixed(partId)) {
        this._fixedParts = this._fixedParts | partId;

        switch (partId) {
          case PartId.TABLE_HEADER:
            (<IStickyDataTable><any>$(this._tableId)).stickyTableHeaders({
              fixedOffset: $('#fixed-scroll-header'),
              leftOffset: 0 /* TODO: this is some compensation for thead border width */
            });
            break;

          case PartId.PAGE_FILTER:
            (<IFixedScrollHeader><any>$('#fixed-scroll-header')).stick_in_parent({
              offset_top: this._pageFilterOffset,
              width_calculator: (element: JQuery) => this._getPageFilterWidth(element)
            });
            break;

          default:
            throw new Error("Not implemented");
        }
      }
    }
  }

  unlock(partIds: PartId[]): void;
  unlock(partId?: PartId): void;
  unlock(aPartIds: any): void {
    if (!this._isEnabled)
      return;

    var partIds = this._getPartIds(aPartIds);

    for (var i = 0; i < partIds.length; i++) {
      var partId = partIds[i];

      if (this._isFixed(partId)) {
        this._fixedParts = this._fixedParts & (~partId);

        switch (partId) {
          case PartId.TABLE_HEADER:
            (<IStickyDataTable><any>$(this._tableId)).stickyTableHeaders('destroy');
            break;

          case PartId.PAGE_FILTER:
            $('#fixed-scroll-header').trigger('sticky_kit:detach');
            break;

          default:
            throw new Error("Not implemented");
        }
      }
    }
  }

  update(partIds: PartId[]): void;
  update(partId?: PartId): void;
  update(aPartIds: any): void {
    if (!this._isEnabled)
      return;

    var originalTop = $(window).scrollTop();

    var partIds = this._getPartIds(aPartIds);

    var isActive = this._isActive(PartId.PAGE_FILTER);

    for (var i = 0; i < partIds.length; i++) {
      var partId = partIds[i];

      if (this._isFixed(partId)) {
        switch (partId) {
          case PartId.TABLE_HEADER:
            $(window).trigger('resize.stickyTableHeaders');
            break;

          case PartId.PAGE_FILTER:
            $(document.body).trigger('sticky_kit:recalc');
            (<IFixedScrollHeader><any>$('#fixed-scroll-header')).stick_in_parent({
              offset_top: this._pageFilterOffset,
              padding_width: this._getPageFilterWidthPadding()
            });
            break;

          default:
            throw new Error("Not implemented");
        }
      }
    }

    // Reposition the vertical scrollbar into a good-looking position
    if (isActive) {
      // TODO: is all this necessary?
      this.unlock(PartId.PAGE_FILTER);
      this.lock(PartId.PAGE_FILTER);
      // move scrollbar so that sticking gets triggered
      // TODO: what is the correct formula?
      $(window).scrollTop($('#header').outerHeight(true) + $('#status').outerHeight(true) + this._getPageFilterHeightPadding() + 1 /* TODO: magic 0 to make the page filter go into the fixed mode */);
    } else {
      $(window).scrollTop(originalTop);
    }
  }

  offsetTop(aValue: string): void {
    var value = parseInt(aValue || '0');
    if (value != this._pageFilterOffset) {
      this._pageFilterOffset = value;
      if (this._isFixed(PartId.PAGE_FILTER)) {
        this.unlock(PartId.PAGE_FILTER);
        this.lock(PartId.PAGE_FILTER);
        this.update(PartId.TABLE_HEADER);
      }
    }
  }
}

export = StickyController;
 
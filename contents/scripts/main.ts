/// <reference path="typings/main.d.ts" />

import Tags = require("./Cloud/Tags");
import Avatars = require("./Cloud/Avatars");
import HashFragment = require("./HashApi/HashFragment");
import OrderHashFragment = require("./HashApi/OrderHashFragment");
import PageLengthHashFragment = require("./HashApi/PageLengthHashFragment");
import PageIndexHashFragment = require("./HashApi/PageIndexHashFragment");
import StickyController = require("./StickyController");
import PartId = require("./PartId");

declare function require(package: string): any;
declare function escapeHtml(html: string): string;
declare function url(u: string): string;

enum ColumnId {
  AUTHOR = 0,
  COMPONENT = 1,
  DESCRIPTION = 2,
  TAGS = 3,
  TAGS_HASH = 4,
  STARS = 5,
  AGE = 6,
  ISSUES = 7,
  FRESHNESS = 8,
  VERSION = 9,
  FORKS = 10,
  FLAGS = 11
}

enum TableLayoutId {
  OPTIMAL = 1,
  SMALL = 2
}

var Selector = {
  AUTHOR: '.author',
  COMPONENT: '.component',
  VERSION: '.version',
  DESCRIPTION: '.description',
  FLAGS: '.flags',
  TAGS: '.tags',
  TAGS_HASH: '.tags-hash',
  FORKS: '.forks',
  ISSUES: '.issues',
  STARS: '.stars',
  WATCHERS: '.watchers',
  AGE: '.age',
  FRESHNESS: '.freshness'
};

function getUtcDate(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

class Application {
  public tags: Tags;
  public avatars: Avatars;
  public sticky: StickyController;
  public orderHashFragment: OrderHashFragment;
  public pageLengthHashFragment: PageLengthHashFragment;
  public pageIndexHashFragment: PageIndexHashFragment;

  private optimalColumnWidths: string[];
  private smallScreenColumnWidths: string[];
  private DEFAULT_ORDER: IColumnOrder[];
  private DEFAULT_PAGE_LENGTH: number;

  private columnWidths: string[];
  private currentTableLayoutId: TableLayoutId;

  private _tableId = '#table';

  private table: IDataTableEx;
  private $input: JQuery;

  constructor() {
    this.currentTableLayoutId = null;
    this.optimalColumnWidths = [
      '10%', // COLUMN_AUTHOR
      '15%', // COLUMN_COMPONENT
      '30%', // COLUMN_DESCRIPTION
      '15%', // COLUMN_TAGS
      null, // COLUMN_TAGS_HASH
      '5%', // COLUMN_STARS
      '5%', // COLUMN_AGE
      '5%', // COLUMN_ISSUES
      '5%', // COLUMN_FRESHNESS
      '5%', // COLUMN_VERSION
      '5%', // COLUMN_FORKS
      null, // COLUMN_FLAGS
      null
    ];
    this.smallScreenColumnWidths = [
      '10%', // COLUMN_AUTHOR
      '10%', // COLUMN_COMPONENT
      '20%', // COLUMN_DESCRIPTION
      '20%', // COLUMN_TAGS
      null, // COLUMN_TAGS_HASH
      '10%', // COLUMN_STARS
      '10%', // COLUMN_AGE
      '10%', // COLUMN_ISSUES
      '10%', // COLUMN_FRESHNESS
      null, // COLUMN_VERSION
      null, // COLUMN_FORKS
      null, // COLUMN_FLAGS
      null
    ];
    this.DEFAULT_ORDER = [[ColumnId.FRESHNESS, 'asc']];
    this.DEFAULT_PAGE_LENGTH = 100;
  }

  private sorry(res: any): void {
    var problem = '';
    if (res instanceof Error) {
      problem = res.message.toString();
    } else {
      if (res.error) {
        problem = res.error.message.toString();
        if (res.status) {
          problem += ", Status: " + res.status.toString();
        }
      }
    }
    $('#error').text($('#error').text() + problem);
    $('#loading').hide();
    $('#error').show();
  }

  private getRecommendedTableLayoutId(): TableLayoutId {
    if (this.sticky.getDocumentWidth() < $(this._tableId).data('small-table-size'))
      return TableLayoutId.SMALL;
    else
      return TableLayoutId.OPTIMAL;
  }

  private getColumnWidths(tableLayoutId: TableLayoutId): string[] {
    switch (tableLayoutId) {
      case TableLayoutId.OPTIMAL:
        return this.optimalColumnWidths;

      case TableLayoutId.SMALL:
        return this.smallScreenColumnWidths;

      default:
        throw Error("Not implemented");
    }
  }

  private getUseAvatarImages(tableLayoutId: TableLayoutId): boolean {
    switch (tableLayoutId) {
      case TableLayoutId.OPTIMAL:
        return true;

      case TableLayoutId.SMALL:
        return false;

      default:
        throw Error("Not implemented");
    }
  }

  private isColumnVisible(columnId: ColumnId): boolean {
    return this.columnWidths[columnId] != null;
  }

  private getColumnWidth(columnId: ColumnId): string {
    return this.columnWidths[columnId];
  }

  private initializeTable(data: any[][]): void {
    this.table = $(this._tableId).DataTable({
      data: data,
      pagingType: 'simple_numbers',
      pageLength: this.DEFAULT_PAGE_LENGTH,
      lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
      processing: false,
      autoWidth: false,
      deferRender: true,
      language: {
        search: '<span class="eye">filter =</span> (',
        lengthMenu: '_MENU_',
        info: '1 ≤ <span class="page">_START_</span> &hellip; <span class="page">_END_</span> ≤ _TOTAL_',
        infoEmpty: '0 ≤ <span class="page">0</span> &hellip; <span class="page">0</span> ≤ 0',
        infoFiltered: ' &lt; _MAX_', // '(Ʃ = _MAX_)'
        thousands: ''
      },
      columns: [
        //  COLUMN_AUTHOR
        {
          'className': Selector.AUTHOR.substr(1),
          'type': 'string',
          'width': this.getColumnWidth(ColumnId.AUTHOR),
          'visible': this.isColumnVisible(ColumnId.AUTHOR)
        },
        // COLUMN_COMPONENT
        {
          'className': Selector.COMPONENT.substr(1),
          'type': 'string',
          'width': this.getColumnWidth(ColumnId.COMPONENT),
          'visible': this.isColumnVisible(ColumnId.COMPONENT)
        },
        // COLUMN_DESCRIPTION
        {
          'className': Selector.DESCRIPTION.substr(1),
          'type': 'string',
          'sortable': false,
          'width': this.getColumnWidth(ColumnId.DESCRIPTION),
          'visible': this.isColumnVisible(ColumnId.DESCRIPTION)
        },
        // COLUMN_TAGS
        {
          'className': Selector.TAGS.substr(1),
          'type': 'string',
          'sortable': false,
          'width': this.getColumnWidth(ColumnId.TAGS),
          'visible': this.isColumnVisible(ColumnId.TAGS)
        },
        // COLUMN_TAGS_HASH
        {
          'className': Selector.TAGS_HASH.substr(1),
          'type': 'string',
          'sortable': false,
          'visible': false,
          // MUST be true. If set to false this column would not be included in the data passed to custom
          // search filter
          'searchable': true
        },
        // COLUMN_STARS
        {
          'className': Selector.STARS.substr(1),
          'type': 'numeric',
          'width': this.getColumnWidth(ColumnId.STARS),
          'visible': this.isColumnVisible(ColumnId.STARS),
          'searchable': false
        },
        // COLUMN_AGE
        {
          'className': Selector.AGE.substr(1),
          'type': 'numeric',
          'width': this.getColumnWidth(ColumnId.AGE),
          'visible': this.isColumnVisible(ColumnId.AGE),
          'searchable': false
        },
        // COLUMN_ISSUES
        {
          'className': Selector.ISSUES.substr(1),
          'type': 'numeric',
          'width': this.getColumnWidth(ColumnId.ISSUES),
          'visible': this.isColumnVisible(ColumnId.ISSUES),
          'searchable': false
        },
        // COLUMN_FRESHNESS
        {
          'className': Selector.FRESHNESS.substr(1),
          'type': 'numeric',
          'width': this.getColumnWidth(ColumnId.FRESHNESS),
          'visible': this.isColumnVisible(ColumnId.FRESHNESS),
          'searchable': false
        },
        // COLUMN_VERSION
        {
          'className': Selector.VERSION.substr(1),
          'type': 'string',
          'width': this.getColumnWidth(ColumnId.VERSION),
          'visible': this.isColumnVisible(ColumnId.VERSION)
        },
        // COLUMN_FORKS
        {
          'className': Selector.FORKS.substr(1),
          'type': 'numeric',
          'width': this.getColumnWidth(ColumnId.FORKS),
          'visible': this.isColumnVisible(ColumnId.FORKS),
          'searchable': false
        },
        // COLUMN_FLAGS
        {
          'className': Selector.FLAGS.substr(1),
          'type': 'string'
        // license is included in the tag column. No need to display it twice
          , 'visible': false,
          'searchable': false
        }
      ],
      'order': this.DEFAULT_ORDER.splice(0) /* pass a mutable copy of the DEFAULT_ORDER */,
      rowCallback: (tr: Element, data: any[]) => {
        var $r = $(tr);

        var author = data[ColumnId.AUTHOR];

        $r.find(Selector.AUTHOR).html('<a href="https://github.com/' + author + '" class="external" target="_blank" title="' + author + '">' + this.avatars.createImageHtml(author) + '<span>' + author + '</span></a>');

        var repo = data[ColumnId.AUTHOR] + '/' + data[ColumnId.COMPONENT];

        var flags = data[ColumnId.FLAGS];

        var componentClass = flags.forked ? ' forked' : '';
        var componentTail = flags.forked ? '<img src=' + url('/resources/forked.png') + ' class="forked">' : '';
        var componentTitleTail = flags.forked ? ' (forked)' : '';

        $r.find(Selector.COMPONENT).html('<a href="https://github.com/' + repo + '" class="external' + componentClass + '" target="_blank" title="' + repo + componentTitleTail + '">' + data[ColumnId.COMPONENT] + componentTail + '</a>');

        if (data[ColumnId.ISSUES] != '') {
          $r.find(Selector.ISSUES).html('<a href="https://github.com/' + repo + '/issues" class="external" target="_blank">' + data[ColumnId.ISSUES] + '</a>');
        }

        $r.find(Selector.TAGS).html(data[ColumnId.TAGS].map(this.tags.createHtml, this.tags).join(""));

        $r.find(Selector.VERSION).attr("title", data[ColumnId.VERSION]);
      },
      // http://datatables.net/reference/option/dom
      'dom': '<"#fixed-scroll-header"<"scroll-header"<"filter"f><"navigator"<"left"i><"right"pl>>>>rt'
    });
  }

  private loadData(components: {
    repo: string;
    keywords?: string[];
    license: any; /* TODO: string | string[] */
    github: {
      stargazers_count?: number;
      open_issues_count?: number;
      forks?: number;
      created_at?: string;
      updated_at?: string;
      owner: {
        gravatar_id?: string;
      }
      fork?: boolean;
    }
    version?: string;
    description?: string;
  }[]): any[][]{
    var now = getUtcDate(new Date());
    var milisecondsPerDay = 24 * 60 * 60 * 1000;
    var data: any[][] = [];

    var n = components.length;

    for (var i = 0; i < n; i++) {
      var component = components[i];
      var j = component.repo.indexOf('/');
      var keywords = component.keywords || [];

      // convert license to tag
      if (component.license != null) {
        var licenses: string[];
        if (component.license instanceof Array)
          licenses = component.license;
        else
          licenses = [component.license];

        for (var l = licenses.length - 1; l >= 0; l--) {
          keywords.push('license ' + licenses[l]);
        }
      } else {
        keywords.push("license undefined");
      }

      keywords.sort(function (a: string, b: string): number {
        return a.localeCompare(b);
      });

      for (var k = 0; k < keywords.length; k++) {
        this.tags.add(keywords[k]);
      }

      var author = component.repo.substr(0, j);

      if (this.avatars.add(author, (component.github.stargazers_count || 0) - (10 /* one open issue removes 10 stars */ * (component.github.open_issues_count || 0)))) {
        this.avatars.set(author, Avatars.PROPERTY_GRAVATAR, component.github.owner.gravatar_id);
      }

      data.push([
      //  COLUMN_AUTHOR
        author,
        // COLUMN_COMPONENT
        component.repo.substr(j + 1),
        // COLUMN_DESCRIPTION
        escapeHtml(component.description || ''), // TODO: is the escaping really needed? is this the right place?
      // COLUMN_TAGS
        keywords,
        // COLUMN_TAGS_HASH
        Tags.SEPARATOR + (keywords || []).map(Tags.hash).join(Tags.SEPARATOR) + Tags.SEPARATOR,
        // COLUMN_STARS
        component.github.stargazers_count || '',
        // COLUMN_AGE
        Math.floor((now - getUtcDate(new Date(component.github.created_at))) / milisecondsPerDay),
        // COLUMN_ISSUES
        component.github.open_issues_count || '',
        // COLUMN_FRESHNESS
        Math.floor((now - getUtcDate(new Date(component.github.updated_at))) / milisecondsPerDay),
        // COLUMN_VERSION
        component.version || '',
        // COLUMN_FORKS
        component.github.forks || '',
        // COLUMN_FLAGS
        { forked: component.github.fork || false }
      ]);
    }

    return data;
  }

  tagControllerClick(visible?: boolean): void {
    this.tags.display(visible);
  }

  avatarControllerClick(visible?: boolean): void {
    this.avatars.display(visible);
  }

  windowSizeChanged(): void {
    var newTableLayoutId = this.getRecommendedTableLayoutId();

    if (this.currentTableLayoutId != newTableLayoutId) {
      this.currentTableLayoutId = newTableLayoutId;

      this.avatars.useImages(this.getUseAvatarImages(this.currentTableLayoutId));
      this.resizeColumns(this.table, this.getColumnWidths(this.currentTableLayoutId));
    }
  }

  resizeColumns(tableApi: IDataTableEx, columnWidths: string[]): void {
    var columns = tableApi.context[0].aoColumns; // TODO: this is a hack-style access. What is the correct API call?
    for (var i = 0; i < columnWidths.length; i++) {
      var columnWidth = columnWidths[i];
      var column = columns[i];
      if (column == null)
        continue;
      if (columnWidth == null) {
        tableApi = tableApi.column(i).visible(false);
      } else {
        column.nTh.style.width = columnWidth;
        tableApi = tableApi.column(i).visible(true);
      }
    }
    this.layoutChanged();
    tableApi.draw();

    this.sticky.unlock(PartId.TABLE_HEADER);
    this.sticky.lock(PartId.TABLE_HEADER);
  }

  private _layoutUpdatedNeeded = false;
  private _lastSavedLayoutOrder: string = null;

  layoutChanged(): void {
    this._layoutUpdatedNeeded = true;
  }

  updateLayout(): void {
    if (this._layoutUpdatedNeeded)
      this.sticky.update();
    this._layoutUpdatedNeeded = false;
  }

  inputChanged(): void {
    if ((this.$input.val() || '') == '') {
      this.$input.removeClass('active');
      this.$input.width('5em' /* TODO: this guesswork should go to CSS definition */);
    } else {
      this.$input.addClass('active');
      this.$input.width(this.$input.textWidth());
    }
  }

  initializeFilterInputField(input: JQuery): void {
    this.$input = input;

    // reconfigure the input field so that it does not filter/sort/draw the datatable after
    // every keypress. Exactly same function is provided by DataTables plugin
    // http://www.datatables.net/plug-ins/api/fnSetFilteringDelay
    // Following code builds upon the plugin concept. Basically it does 'undo' of the
    // input field capture code at
    // https://github.com/DataTables/DataTables/blob/1.10.0/media/js/jquery.dataTables.js#L2664
    // and reschedules it using a timer for little bit after and adds a temporary '.busy' css
    // decorator to the search field
    {
      var oldTimerId: number = null;

      // as there is not public jQuery method to inspect the event handlers we're using
      // peek into the internal jQuery structures as suggested here
      // http://stackoverflow.com/a/13018025/2626313
      var oldEventHandler = ($._data(this.$input[0], "events")['keyup'])[0].handler;

      this.$input.off('keyup.DT search.DT input.DT paste.DT cut.DT').on('keyup.DT search.DT input.DT paste.DT cut.DT', (event: Event) => {
        this.$input.addClass('busy');
        window.clearTimeout(oldTimerId);
        oldTimerId = window.setTimeout(() => {
          this.$input.removeClass('busy');

          this.layoutChanged();

          oldEventHandler.apply(event.target);

          this.inputChanged();
        }, 300 /* TODO: TUNE: put here some 'nice' number */
          );
      });
    }
  }

  applyFilter(tableApi: IDataTableEx, value: string, newPageIndex: number): void {
    if (value != null) {
      this.$input.val(value);
    }

    this.inputChanged();

    // as a side-effect of this call should be the call to saveState()
    tableApi = tableApi.search(this.$input.val());

    var resetPosition = true;

    if (newPageIndex != null) {
      tableApi = tableApi.page(newPageIndex);
      resetPosition = false;
    }
    tableApi.draw(resetPosition);
  }

  private currentStateHash: string = null;

  saveState(): void {
    var originalTop = $(window).scrollTop();
    try {
      var orderParam = this.orderHashFragment.encode(this.table.order());

      // default order will not be saved in the hash fragment
      if (orderParam == this.orderHashFragment.encode(this.DEFAULT_ORDER))
        orderParam = '';

      var pageLengthParam = this.pageLengthHashFragment.encode(this.table.page.len());

      var pageIndexParam = this.pageIndexHashFragment.encode(this.table.page());

      var hash = HashFragment.encode({
        's': this.$input.val(),
        't': this.tags.getFilteredArray(),
        'a': this.avatars.getFilteredArray(),
        'o': orderParam,
        'p': pageIndexParam,
        'l': pageLengthParam
      });

      if (HashFragment.equals(hash, this.currentStateHash)) {
        // nothing to do
        return;
      }

      // Automatically trigger layout update when sorting headers change. Due to
      // sorting header change the header's height may change as well and layout needs
      // to be updated, fix for https://github.com/xmojmr/component.io/issues/12
      if (this._lastSavedLayoutOrder != null && this._lastSavedLayoutOrder != orderParam)
        this.layoutChanged();
      this._lastSavedLayoutOrder = orderParam;
    
      if (!HashFragment.equals(window.location.hash, hash)) {
        window.location.hash = HashFragment.normalize(hash);
        // TODO: would that make any sense?
        // window.history.pushState(null, null, hash || '#');
      }
      if (!HashFragment.equals(hash, '')) {
        // TODO: this is attempt to fix IE behavior in local 'file:' mode. Is it really needed?
        // is this the correct way to 'fix it'?
        window.location.href = window.location.href;
      }

      this.currentStateHash = hash;
    } finally {
      $(window).scrollTop(originalTop);
    }
  }

  tagClick(element: Element): void {
    var self = $(element);

    this.tags.toggle(self.data('tag'), self.data('hash'));

    // hide the cloud selector on tag-select
    this.tagControllerClick(false);

    this.saveState();
    this.layoutChanged();

    // filter the data table
    this.table.draw();
  }

  avatarClick(element: Element): void {
    var self = $(element);

    this.avatars.toggle(self.data('avatar'), self.data('hash'));

    // hide the cloud selector on tag-select
    this.avatarControllerClick(false);

    this.saveState();
    this.layoutChanged();

    // filter the data table
    this.table.draw();
  }

  gotoState(hash?: string): void {
    if (hash == null)
      hash = window.location.hash;

    if (HashFragment.equals(hash, this.currentStateHash)) {
      // nothing to do
      return;
    }

    var hashParams = HashFragment.decode(hash);

    this.tags.activate(hashParams['t']);
    this.avatars.activate(hashParams['a']);
    var pageLength = this.pageLengthHashFragment.decode(hashParams['l'] || '');
    var pageIndex = this.pageIndexHashFragment.decode(hashParams['p'] || '');
    var orderParam = hashParams['o'] || '';

    var tableApi: IDataTableEx;

    if (orderParam == '')
      tableApi = this.table.order(this.DEFAULT_ORDER);
    else
      tableApi = this.table.order(this.orderHashFragment.decode(orderParam));
    if (pageLength != this.table.page.len())
      tableApi = tableApi.page.len(pageLength);
    var newPageIndex: number = null;
    if (pageIndex != this.table.page())
      newPageIndex = pageIndex;
    this.applyFilter(tableApi, hashParams['s'] || '', newPageIndex);
  }

  main(): void {

  require("superagent")
      .get('/api/v1/crawler.json')
      .withCredentials()
      .on('error', (res: any) => {
        this.sorry(res);
      })
      .end((res: any) => {
        if (!res.ok) {
          this.sorry(res);
          return;
        }

        // TODO: text displayed to user in the meaining of "any value matches"
        var ANY_VALUE = '<span class="any">∀</span>';

        this.tags = new Tags([0.8, 2.5] /* TUNE: font size range */, ANY_VALUE);

        this.avatars = new Avatars($('#avatars').data('image-size'), [0.8, 1, 3] /* TUNE: font size range */, ANY_VALUE);

        var lastModified: Date;

        try {
          lastModified = new Date(new Date(res.header['last-modified']).setMilliseconds(0));
          var data = this.loadData(res.body.components);
        } catch (error) {
          this.sorry(error);
          return;
        }

        this.sticky = new StickyController(this._tableId);
        
        this.currentTableLayoutId = this.getRecommendedTableLayoutId();

        this.avatars.useImages(this.getUseAvatarImages(this.currentTableLayoutId));

        this.columnWidths = this.getColumnWidths(this.currentTableLayoutId);

        this.initializeTable(data);

        $('.dataTables_filter').append($('#tags-controller'));
        $('.dataTables_filter').append($('#avatars-controller'));

        // $('.dataTables_filter input').attr('placeholder', ANY_VALUE_TEXT);

        $('#last-modified').attr('datetime', lastModified.toJSON());
        $('#last-modified').attr('title', lastModified.toJSON());
        $('#last-modified').timeago();

        $('#release-date').timeago();

        // hide loading indicator and show so far hidden elements
        $('#loading').toggle();
        $('.invisible').removeClass('invisible');

        // hide tag clould
        $("#tags").toggle();
        $("#avatars").toggle();

        // On touch devices (e.g. Opera Mobile 12 on Android) all the sticky stuff is
        // very unreliable calculating wrong positions etc. I'll disable sticking completely
        //
        // TODO: make the sticking work event on mobile devices
        this.sticky.isEnabled(!$('html').hasClass('touch'));

        window.tagControllerClick = () => this.tagControllerClick();
        $('#tag-filter').html(ANY_VALUE);

        window.avatarControllerClick = () => this.avatarControllerClick();
        $('#avatar-filter').html(ANY_VALUE);

        $.fn.dataTable.ext.search.push((settings: any, data: any[], dataIndex: number) => {
          if (this.tags.isFilterEmpty()) {
            return true;
          } else {
            return this.tags.isMatch(data[ColumnId.TAGS_HASH]);
          }
        });

        $.fn.dataTable.ext.search.push((settings: any, data: any[], dataIndex: number) => {
          if (this.avatars.isFilterEmpty()) {
            return true;
          } else {
            return this.avatars.isMatch(Avatars.SEPARATOR + data[ColumnId.AUTHOR] + Avatars.SEPARATOR);
          }
        });

        $(window).resize(() => this.windowSizeChanged());

        this.orderHashFragment = new OrderHashFragment(this.table);

        this.pageLengthHashFragment = new PageLengthHashFragment(this.table, this.DEFAULT_PAGE_LENGTH);

        this.pageIndexHashFragment = new PageIndexHashFragment();

        this.initializeFilterInputField($('.dataTables_filter :input[type=search]'));

        window.tagClick = (element) => this.tagClick(element);

        window.avatarClick = (element) => this.avatarClick(element);

        // handle all changes triggered internally or through UI
        // this might be alternatively monitored on the $input element through 'input' and 'keyup' events
        // http://datatables.net/forums/discussion/21284/how-to-detect-when-filter-field-gets-cleared-by-the-x-button-click
        $(this._tableId).on('search.dt', () => this.saveState());

        // Respond to page-length changes
        $(this._tableId).on('length.dt', () => {
          this.saveState();
          this.layoutChanged();
        });

        // Respond to page-index changes
        $(this._tableId).on('page.dt', () => this.saveState());

        $(this._tableId).on('draw.dt', () => this.updateLayout());

        // hashchange (HTML4) seems to be the only really cross-browser compatible way how to make
        // some sort of hash fragment history work. Especially when the local 'file:' mode is needed
        $(window).on('hashchange', () => this.gotoState());

        this.sticky.lock();

        this.inputChanged();

        this.gotoState();

        // If there are no filters set through the url (tags, avaters, full text) then put focus to the input
        // field - hinting user to enter full text filter
        var hashParams = HashFragment.decode(this.currentStateHash);
        if (((hashParams['t'] || '') + (hashParams['a'] || '') + (hashParams['s'] || '')) == '') {
          this.$input.focus();
          // make whole above screen part visible
          $(window).scrollTop(0);
        }
      }
    );
  }
}

$(document).ready(function () {
  new Application().main();
});

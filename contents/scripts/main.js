"use strict";
$(document).ready(function () {
  var sorry = function (res) {
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

  require("superagent")
    .get('/api/v1/crawler.json')
    .withCredentials()
    .on('error', function (res) {
      sorry(res);
    })
    .end(function (res) {
      if (!res.ok) {
        sorry(res);
        return;
      }

      try {
        var json = res.body;
        var lastModified = new Date(new Date(res.header['last-modified']).setMilliseconds(0));
        var data = [];

        var getUtcDate = function (d) {
          return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        };

        var COLUMN_AUTHOR = 0;
        var COLUMN_COMPONENT = 1;
        var COLUMN_DESCRIPTION = 2;
        var COLUMN_TAGS = 3;
        var COLUMN_TAGS_HASH = 4;
        var COLUMN_STARS = 5;
        var COLUMN_AGE = 6;
        var COLUMN_ISSUES = 7;
        var COLUMN_FRESHNESS = 8;
        var COLUMN_VERSION = 9;
        var COLUMN_FORKS = 10;
        var COLUMN_FLAGS = 11;

        var optimalColumnWidths = [
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

        var smallScreenColumnWidths = [
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

        var SELECTOR_AUTHOR = '.author';
        var SELECTOR_COMPONENT = '.component';
        var SELECTOR_VERSION = '.version';
        var SELECTOR_DESCRIPTION = '.description';
        var SELECTOR_FLAGS = '.flags';
        var SELECTOR_TAGS = '.tags';
        var SELECTOR_TAGS_HASH = '.tags-hash';
        var SELECTOR_FORKS = '.forks';
        var SELECTOR_ISSUES = '.issues';
        var SELECTOR_STARS = '.stars';
        var SELECTOR_WATCHERS = '.watchers';
        var SELECTOR_AGE = '.age';
        var SELECTOR_FRESHNESS = '.freshness';

        var PROPERTY_GRAVATAR = 'g';

        var DEFAULT_ORDER = [[COLUMN_FRESHNESS, 'asc']];
        var DEFAULT_PAGE_LENGTH = 100;

        // TODO: text displayed to user in the meaining of "any value matches"
        var ANY_VALUE_TEXT = '∀';

        var ANY_VALUE = '<span class="any">' + ANY_VALUE_TEXT + '</span>';

        var Range = Class({
          constructor: function (minFontSize, maxFontSize, minValue, maxValue) {
            this._minFontSize = minFontSize;
            this._maxFontSize = maxFontSize;
            this._minValue = minValue;
            this._maxValue = maxValue;
          },

          includes: function (w) {
            return w >= this._minValue && w <= this._maxValue;
          },

          getSize: function (w) {
            if (w == this._minValue)
              return this._minFontSize;

            var weightBase = this._minValue - 1;

            return ((Math.log(w - this._minValue + 1) / Math.log(this._maxValue - this._minValue + 1)) * (this._maxFontSize - this._minFontSize)) + this._minFontSize;
          }
        });

        var Cloud = Class({
          $statics: {
            hash: function (t) {
              return t.toLowerCase();
            },

            SEPARATOR: ';' // TODO: use some distinct character that certainly is not present in the hash code
          },

          constructor: function (className, htmlJoinOperator, fontSizeRanges) {
            this._className = className;
            this._htmlJoinOperator = htmlJoinOperator;
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
          },

          /**
           * registers key in the cloud. Returns true if the key was
           * newly added
           */
          add: function (key, weight) {
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
          },

          set: function (key, propertyName, propertyValue) {
            var bag = this._properties[key] || {};
            if (propertyValue == null)
              delete bag[propertyName];
            else
              bag[propertyName] = propertyValue;
            this._properties[key] = bag;
          },

          get: function (key, propertyName) {
            var bag = this._properties[key];
            if (bag == null)
              return null;
            return bag[propertyName];
          },

          _sort: function () {
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

            this._items.sort(function (a, b) {
              return a.key.localeCompare(b.key);
            });
          },

          _getText: function (t, size) {
            return escapeHtml(t);
          },

          createHtml: function (t, attributes, size) {
            var active = '';
            var hash = this.$class.hash(t);
            if (this._filteredHashes[hash])
              active = ' active';
            return '<span class="' + this._className + active + '" onclick="' + this._className + 'Click(this)"' + (attributes || '') + ' data-hash="' + hash + '" data-' + this._className + '="' + t + '">' + this._getText(t, size) + '</span>';
          },

          _createCloudHtml: function (fontSizeRanges) {
            this._sort();

            var ranges = [];
            var getRange;

            switch ((fontSizeRanges || [1]).length) {
              case 1:
                ranges.push(new Range(
                  fontSizeRanges[0],
                  fontSizeRanges[0],
                  this._minWeight,
                  this._maxWeight
                ));
                getRange = function (w) { return ranges[0]; }
                break;

              case 2:
                ranges.push(new Range(
                  fontSizeRanges[0],
                  fontSizeRanges[1],
                  this._minWeight,
                  this._maxWeight
                ));
                getRange = function (w) { return ranges[0]; }
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
                }
                break;

              default:
                throw Error("Not supported number of ranges");
            }

            var getRange;

            var fontSizes = {};
            var fontSizeStyles = {};

            var weightBase = this._minWeight - 1;
            var logBase = Math.log((this._maxWeight - weightBase) / 10 /* TODO: TUNE: */);
            var logMax = Math.log(this._maxWeight - weightBase) / logBase;

            return this._items.map(
              function (t) {
                var w = t.weight + t.count;

                var fontSize = fontSizes[w];
                var fontSizeStyle;

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
          },

          createCloudHtml: function () {
            if (this._cloudHtml == null)
              this._cloudHtml = this._createCloudHtml(this._fontSizeRanges);

            return this._cloudHtml;
          },

          getControllerButtonControl: function () {
            return $('#' + this._className + 's-controller a.ui-button');
          },

          getCloudControl: function () {
            return $('#' + this._className + 's');
          },

          isFilterEmpty: function () {
            return this._filteredHashedArray.length == 0;
          },

          isMatch: function (hashes) {
            // row is accepted only if it contains ALL tags
            for (var i = this._filteredHashedArray.length - 1; i >= 0; i--) {
              if (hashes.indexOf(this._filteredHashedArray[i]) < 0)
                return false;
            }
            return true;
          },

          getFilteredArray: function () {
            return this._filteredArray;
          },

          toggle: function (key, hash) {
            var tagHash = this.$class.hash;
            var SEPARATOR = this.$class.SEPARATOR;

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
            this._filteredArray.sort(function (a, b) {
              return a.localeCompare(b);
            });

            // Invalidate cloud html cache
            this._cloudHtml = null;

            this._draw();

            this._filteredHashedArray = this._filteredArray.map(function (t) { return SEPARATOR + tagHash(t) + SEPARATOR; });
          },

          _draw: function () {
            var container = $('#' + this._className + '-filter');

            switch (this._filteredArray.length) {
              case 0:
                container.html(ANY_VALUE);
                break;

              case 1:
                container.html(this._filteredArray.map(this.createHtml, this).join(this._htmlJoinOperator));
                break;

              default:
                container.html("(" + this._filteredArray.map(this.createHtml, this).join(this._htmlJoinOperator) + ")");
                break;
            }
          },

          _normalize: function(value) {
            return value;
          },

          activate: function (filter) {
            filter = filter || [];
            if (!(filter instanceof Array))
              filter = [filter];

            // turn-off all previous tag filters
            while (this._filteredArray.length > 0)
              this.toggle(this._filteredArray[0]);

            for (var i = 0; i < filter.length; i++)
              this.toggle(this._normalize(filter[i]));
          },

          display: function (visible) {
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
                onClose: method(this, function () {
                  this.display(false)
                })
              });
            } else {
              this.getControllerButtonControl().removeClass('ui-state-active');

              modal.close();
            }
          }
        });

        var Tags = Class(Cloud, {
          constructor: function (fontSizeRanges) {
            Cloud.call(this, 'tag', ' &#8743; ', fontSizeRanges);
          }
        });

        var tags = new Tags([0.8, 2.5] /* TUNE: font size range */);

        var Avatars = Class(Cloud, {
          constructor: function (fallbackImageSize, fontSizeRanges) {
            Cloud.call(this, 'avatar', ' &#8744; ', fontSizeRanges);
            this._fallbackImageSize = fallbackImageSize.toString();
            this._useImages = true;
          },

          isMatch: function (hashes) {
            // row is accepted only if it contains ANY of the avatar hashes
            for (var i = this._filteredHashedArray.length - 1; i >= 0; i--) {
              if (hashes.indexOf(this._filteredHashedArray[i]) >= 0)
                return true;
            }
            return false;
          },

          useImages: function (value) {
            if (this._useImages != value) {
              this._useImages = value;
              this._draw();
            }
          },

          _getText: function (t, size) {
            return this.createImageHtml(t, size) + this.$class.$superp._getText.call(this, t);
          },

          createImageHtml: function (key, size) {
            if (!this._useImages)
              return '';

            var gravatar = this.get(key, PROPERTY_GRAVATAR);
            if (gravatar != null) {
              if (size == null || isNaN(size)) {
                size = this._fallbackImageSize;
              } else {
                // http://pxtoem.com/
                size = Math.round(size * 16 /* em_to_px */ * 1.2 /* magic scale factor saying how much is image bigger than text of the same importance */).toString();
              }
              gravatar = 'http://www.gravatar.com/avatar/' + gravatar + '.png?s=' + size;
              gravatar = '<img src="' + gravatar + '" width="' + size + '" height="' + size + '" alt="' + key + '">';
            } else {
              gravatar = '';
            }
            return gravatar;
          },

          _createCloudHtml: function (fontSizeRanges) {
            var oldUseImages = this._useImages;
            this._useImages = true;
            try {
              return this.$class.$superp._createCloudHtml.call(this, fontSizeRanges);
            } finally {
              this._useImages = oldUseImages;
            }
          }
        });

        var avatars = new Avatars($('#avatars').data('image-size'), [0.8, 1, 3] /* TUNE: font size range */);

        var now = getUtcDate(new Date());
        var milisecondsPerDay = 24 * 60 * 60 * 1000;
        var n = json.components.length;

        for (var i = 0; i < n; i++) {
          var component = json.components[i];
          var j = component.repo.indexOf('/');
          var keywords = component.keywords || [];

          // convert license to tag
          if (component.license != null) {
            var licenses;
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

          keywords.sort(function (a, b) {
            return a.localeCompare(b);
          });

          for (var k = 0; k < keywords.length; k++) {
            tags.add(keywords[k]);
          }

          var author = component.repo.substr(0, j);

          if (avatars.add(author, (component.github.stargazers_count || 0) - (10 /* one open issue removes 10 stars */ * (component.github.open_issues_count || 0)))) {
            avatars.set(author, PROPERTY_GRAVATAR, component.github.owner.gravatar_id);
          };

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
            { forked: component.github.fork || false },
          ]);
        }
      } catch (error) {
        sorry(error);
        return;
      }

      var TABLE_LAYOUT_OPTIMAL = 1
      var TABLE_LAYOUT_SMALL = 2;

      var currentTableLayoutId = null;

      var getRecommendedTableLayoutId = function () {
        if ($(document).width() < $(tableId).data('small-table-size'))
          return TABLE_LAYOUT_SMALL;
        else
          return TABLE_LAYOUT_OPTIMAL;
      };

      var getColumnWidths = function (tableLayoutId) {
        switch (tableLayoutId) {
          case TABLE_LAYOUT_OPTIMAL:
            return optimalColumnWidths;

          case TABLE_LAYOUT_SMALL:
            return smallScreenColumnWidths;

          default:
            throw Error("Not implemented");
        }
      }

      var getUseAvatarImages = function (tableLayoutId) {
        switch (tableLayoutId) {
          case TABLE_LAYOUT_OPTIMAL:
            return true;

          case TABLE_LAYOUT_SMALL:
            return false;

          default:
            throw Error("Not implemented");
        }
      };

      var tableId = '#table';

      currentTableLayoutId = getRecommendedTableLayoutId();

      avatars.useImages(getUseAvatarImages(currentTableLayoutId));

      var columnWidths = getColumnWidths(currentTableLayoutId);

      var isColumnVisible = function (columnId) {
        return columnWidths[columnId] != null;
      }

      var getColumnWidth = function (columnId) {
        return columnWidths[columnId];
      }

      var table = $(tableId).DataTable({
        data: data,
        pagingType: 'simple_numbers',
        pageLength: DEFAULT_PAGE_LENGTH,
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
            'className': SELECTOR_AUTHOR.substr(1),
            'type': 'string',
            'width': getColumnWidth(COLUMN_AUTHOR),
            'visible': isColumnVisible(COLUMN_AUTHOR)
          },
          // COLUMN_COMPONENT
          {
            'className': SELECTOR_COMPONENT.substr(1),
            'type': 'string',
            'width': getColumnWidth(COLUMN_COMPONENT),
            'visible': isColumnVisible(COLUMN_COMPONENT)
          },
          // COLUMN_DESCRIPTION
          {
            'className': SELECTOR_DESCRIPTION.substr(1),
            'type': 'string',
            'sortable': false,
            'width': getColumnWidth(COLUMN_DESCRIPTION),
            'visible': isColumnVisible(COLUMN_DESCRIPTION)
          },
          // COLUMN_TAGS
          {
            'className': SELECTOR_TAGS.substr(1),
            'type': 'string',
            'sortable': false,
            'width': getColumnWidth(COLUMN_TAGS),
            'visible': isColumnVisible(COLUMN_TAGS)
          },
          // COLUMN_TAGS_HASH
          {
            'className': SELECTOR_TAGS_HASH.substr(1),
            'type': 'string',
            'sortable': false,
            'visible': false,
            // MUST be true. If set to false this column would not be included in the data passed to custom
            // search filter
            'searchable': true
          },
          // COLUMN_STARS
          {
            'className': SELECTOR_STARS.substr(1),
            'type': 'numeric',
            'width': getColumnWidth(COLUMN_STARS),
            'visible': isColumnVisible(COLUMN_STARS),
            'searchable': false
          },
          // COLUMN_AGE
          {
            'className': SELECTOR_AGE.substr(1),
            'type': 'numeric',
            'width': getColumnWidth(COLUMN_AGE),
            'visible': isColumnVisible(COLUMN_AGE),
            'searchable': false
          },
          // COLUMN_ISSUES
          {
            'className': SELECTOR_ISSUES.substr(1),
            'type': 'numeric',
            'width': getColumnWidth(COLUMN_ISSUES),
            'visible': isColumnVisible(COLUMN_ISSUES),
            'searchable': false
          },
          // COLUMN_FRESHNESS
          {
            'className': SELECTOR_FRESHNESS.substr(1),
            'type': 'numeric',
            'width': getColumnWidth(COLUMN_FRESHNESS),
            'visible': isColumnVisible(COLUMN_FRESHNESS),
            'searchable': false
          },
          // COLUMN_VERSION
          {
            'className': SELECTOR_VERSION.substr(1),
            'type': 'string',
            'width': getColumnWidth(COLUMN_VERSION),
            'visible': isColumnVisible(COLUMN_VERSION)
          },
          // COLUMN_FORKS
          {
            'className': SELECTOR_FORKS.substr(1),
            'type': 'numeric',
            'width': getColumnWidth(COLUMN_FORKS),
            'visible': isColumnVisible(COLUMN_FORKS),
            'searchable': false
          },
          // COLUMN_FLAGS
          {
            'className': SELECTOR_FLAGS.substr(1),
            'type': 'string'
            // license is included in the tag column. No need to display it twice
            , 'visible': false,
            'searchable': false
          }
        ],
        'order': DEFAULT_ORDER,
        rowCallback: function (tr, data) {
          var $r = $(tr);

          var author = data[COLUMN_AUTHOR];

          $r.find(SELECTOR_AUTHOR).html('<a href="https://github.com/' + author + '" class="external" target="_blank" title="' + author + '">' + avatars.createImageHtml(author) + '<span>' + author + '</span></a>');

          var repo = data[COLUMN_AUTHOR] + '/' + data[COLUMN_COMPONENT];

          var flags = data[COLUMN_FLAGS];

          var componentClass = flags.forked ? ' forked': '';
          var componentTail = flags.forked ? '<img src=' + url('/resources/forked.png') + ' class="forked">' : '';
          var componentTitleTail = flags.forked ? ' (forked)' : '';

          $r.find(SELECTOR_COMPONENT).html('<a href="https://github.com/' + repo + '" class="external' + componentClass + '" target="_blank" title="' + repo + componentTitleTail + '">' + data[COLUMN_COMPONENT] + componentTail + '</a>');

          if (data[COLUMN_ISSUES] != '') {
            $r.find(SELECTOR_ISSUES).html('<a href="https://github.com/' + repo + '/issues" class="external" target="_blank">' + data[COLUMN_ISSUES] + '</a>');
          }

          $r.find(SELECTOR_TAGS).html(data[COLUMN_TAGS].map(tags.createHtml, tags).join(""));

          $r.find(SELECTOR_VERSION).attr("title", data[COLUMN_VERSION]);
        },
        // http://datatables.net/reference/option/dom
        'dom': '<"#fixed-scroll-header"<"scroll-header"<"filter"f><"navigator"<"left"i><"right"pl>>>>rt'
      });

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

      var StickyController = Class({
        $statics: {
          TABLE_HEADER: 1,
          PAGE_FILTER: 2
        },

        constructor: function () {
          this._fixedParts = 0;
          this._pageFilterOffset = 0;
          this._isEnabled = true;
          $(window).scroll(method(this, this._windowScrollChanged));
        },

        isEnabled: function(value) {
          if (value != null)
            if (value != this._isEnabled)
              if (value) {
                this._isEnabled = true;
              } else {
                this.unlock();
                this._isEnabled = false;
              }
          return this._isEnabled;
        },

        _getPageFilterWidthPadding: function() {
          return parseInt($("#content").css('paddingLeft'));
        },

        _getPageFilterWidth: function(element) {
          return $('#content').outerWidth();
        },

        _getPageFilterHeightPadding: function () {
          return parseInt($('#fixed-scroll-header').css('paddingTop'));
        },

        _windowScrollChanged: function () {
          if (this._isFixed(StickyController.PAGE_FILTER)) {
            // Let the interior of the filter row respond to horizontal window scrollbar changes
            $('#fixed-scroll-header .scroll-header').css({
              left: (-$(document).scrollLeft() + this._getPageFilterWidthPadding()).toString() + 'px'
            });
          }
        },

        _isFixed: function (partId) {
          return (this._fixedParts & partId) != 0;
        },

        _isActive: function (partId) {
          if (!this._isEnabled)
            return false;

          switch (partId) {
            case StickyController.TABLE_HEADER:
              return $(tableId + ' thead.tableFloatingHeaderOriginal').css('position') == 'fixed';

            case StickyController.PAGE_FILTER:
              return $('#fixed-scroll-header').hasClass('is_stuck');
          }

          return false;
        },

        _getPartIds: function (partIds) {
          if (partIds instanceof Array)
            return partIds;
          if (partIds == null)
            return [
              StickyController.PAGE_FILTER,
              StickyController.TABLE_HEADER
            ];
          return [partIds];
        },

        lock: function (partIds) {
          if (!this._isEnabled)
            return;

          partIds = this._getPartIds(partIds);

          for (var i = 0; i < partIds.length; i++) {
            var partId = partIds[i];

            if (!this._isFixed()) {
              this._fixedParts = this._fixedParts | partId;

              switch (partId) {
                case StickyController.TABLE_HEADER:
                  $(tableId).stickyTableHeaders({
                    fixedOffset: $('#fixed-scroll-header'),
                    leftOffset: 0 /* TODO: this is some compensation for thead border width */
                  });
                  break;

                case StickyController.PAGE_FILTER:
                  $('#fixed-scroll-header').stick_in_parent({
                    offset_top: this._pageFilterOffset,
                    width_calculator: method(this, this._getPageFilterWidth)
                  });
                  break;
              }
            }
          }
        },

        unlock: function (partIds) {
          if (!this._isEnabled)
            return;

          partIds = this._getPartIds(partIds);

          for (var i = 0; i < partIds.length; i++) {
            var partId = partIds[i];

            if (this._isFixed(partId)) {
              this._fixedParts = this._fixedParts & (~partId);

              switch (partId) {
                case StickyController.TABLE_HEADER:
                  $(tableId).stickyTableHeaders('destroy');
                  break;

                case StickyController.PAGE_FILTER:
                  $('#fixed-scroll-header').trigger('sticky_kit:detach');
                  break;
              }
            }
          }
        },

        update: function (partIds) {
          if (!this._isEnabled)
            return;

          var originalTop = $(window).scrollTop();

          partIds = this._getPartIds(partIds);

          var isActive = this._isActive(StickyController.PAGE_FILTER);

          for (var i = 0; i < partIds.length; i++) {
            var partId = partIds[i];

            if (this._isFixed(partId)) {
              switch (partId) {
                case StickyController.TABLE_HEADER:
                  $(window).trigger('resize.stickyTableHeaders');
                  break;

                case StickyController.PAGE_FILTER:
                  $(document.body).trigger('sticky_kit:recalc');
                  $('#fixed-scroll-header').stick_in_parent({
                    offset_top: this._pageFilterOffset,
                    padding_width: this._getPageFilterWidthPadding()
                  });
                  break;
              }
            }
          }

          // Reposition the vertical scrollbar into a good-looking position
          if (isActive) {
            // TODO: is all this necessary?
            this.unlock(StickyController.PAGE_FILTER);
            this.lock(StickyController.PAGE_FILTER);
            // move scrollbar so that sticking gets triggered
            // TODO: what is the correct formula?
            $(window).scrollTop($('#header').outerHeight(true) + $('#status').outerHeight(true) + this._getPageFilterHeightPadding() + 1 /* TODO: magic 0 to make the page filter go into the fixed mode */);
          } else {
            $(window).scrollTop(originalTop);
          }
        },

          offsetTop: function (value) {
            value = parseInt(value || 0);
            if (value != this._pageFilterOffset) {
              this._pageFilterOffset = value;
              if (this._isFixed(StickyController.PAGE_FILTER)) {
                this.unlock(StickyController.PAGE_FILTER);
                this.lock(StickyController.PAGE_FILTER);
                this.update(StickyController.TABLE_HEADER);
            }
          }
        }
      });
      var sticky = new StickyController();

      // On touch devices (e.g. Opera Mobile 12 on Android) all the sticky stuff is
      // very unreliable calculating wrong positions etc. I'll disable sticking completely
      //
      // TODO: make the sticking work event on mobile devices
      sticky.isEnabled(!$('html').hasClass('touch'));

      window.tagControllerClick = function (visible) {
        tags.display(visible);
      };
      $('#tag-filter').html(ANY_VALUE);

      window.avatarControllerClick = function (visible) {
        avatars.display(visible);
      };
      $('#avatar-filter').html(ANY_VALUE);

      $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
        if (tags.isFilterEmpty()) {
          return true;
        } else {
          return tags.isMatch(data[COLUMN_TAGS_HASH]);
        }
      });

      $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
        if (avatars.isFilterEmpty()) {
          return true;
        } else {
          return avatars.isMatch(Avatars.SEPARATOR + data[COLUMN_AUTHOR] + Avatars.SEPARATOR);
        }
      });

      var windowSizeChanged = function () {
        var newTableLayoutId = getRecommendedTableLayoutId();

        if (currentTableLayoutId != newTableLayoutId) {
          currentTableLayoutId = newTableLayoutId;

          avatars.useImages(getUseAvatarImages(currentTableLayoutId));
          resizeColumns(table, getColumnWidths(currentTableLayoutId));
        }
      };

      $(window).resize(windowSizeChanged);

      var _layoutUpdatedNeeded = false;
      var layoutChanged = function () {
        _layoutUpdatedNeeded = true;
      };

      var updateLayout = function () {
        if (_layoutUpdatedNeeded)
          sticky.update();
        _layoutUpdatedNeeded = false;
      }

      var HashFragment = Class({
        $statics: {
          // inspired by http://stackoverflow.com/a/21350778/2626313
          decode: function (hash) {
            if (!hash) return {};
            hash = hash.split('#')[1 /* analyze the part after hash */].split('&');
            var b = hash.length, c = {}, d, k, v;
            while (b--) {
              d = hash[b].split('=');
              k = d[0].replace('[]', ''), v = decodeURIComponent(d[1] || '');
              c[k] ? typeof c[k] === 'string' ? (c[k] = [v, c[k]]) : (c[k].unshift(v)) : c[k] = v;
            }
            return c;
          },

          encode: function (hashParams) {
            var encode = function (key, value) {
              return key + '=' + encodeURIComponent(value).replace('+', /%20/g);
            };

            var query = [];
            for (var key in hashParams)
              if (hashParams.hasOwnProperty(key)) {
                var value = hashParams[key];
                if (value instanceof Array) {
                  for (var i = 0; i < value.length; i++)
                    query.push(encode(key, value[i]));
                } else {
                  if (value != '')
                    query.push(encode(key, value));
                }
              }
            if (query.length == 0) {
              return '';
            } else {
              return '#' + query.join('&');
            }
          },

          normalize: function (hash) {
            if (hash == null)
              return '';
            if (hash == '' || hash == '#')
              return '';
            return hash;
          },

          equals: function (a, b) {
            return HashFragment.normalize(a) == HashFragment.normalize(b);
          }
        }
      });

      var OrderHashFragment = Class({
        $statics: {
          DEFAULT_SORT_DIRECTION: 'asc'
        },

        constructor: function (table) {
          this._table = table;
        },

        _getColumnNames: function () {
          var result = [];
          var tableColumns = this._table.settings()[0].aoColumns;
          for (var i = 0; i < tableColumns.length; i++) {
            var column = tableColumns[i];
            result[i] = column.className;
          }
          return result;
        },

        decode: function (hash) {
          var params = hash.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t != ''; });
          var result = [];
          for (var i = 0; i < params.length; i++) {
            var param = params[i].split(' ');
            var columnName = param[0];
            var columnIndex = this._getColumnNames().indexOf(columnName);
            if (columnIndex >= 0) {
              result.push([columnIndex, param[1] || OrderHashFragment.DEFAULT_SORT_DIRECTION]);
            }
          }
          return result;
        },

        encode: function (orderParam) {
          var result = [];
          var columnNames = this._getColumnNames();
          for (var i = 0; i < orderParam.length; i++) {
            var sortDirection = ' ' + orderParam[i][1];
            if (sortDirection == ' ' + OrderHashFragment.DEFAULT_SORT_DIRECTION)
              sortDirection = '';
            result.push(columnNames[orderParam[i][0]] + sortDirection);
          }
          return result.join(',');
        }
      });

      var orderHashFragment = new OrderHashFragment(table);

      var PageLengthHashFragment = Class({
        constructor: function (table) {
          this._table = table;
        },

        _getValidPageLengths: function () {
          return this._table.settings()[0].aLengthMenu[0];
        },

        _getPageLengthNames: function () {
          return this._table.settings()[0].aLengthMenu[1];
        },

        decode: function (hash) {
          var names = this._getPageLengthNames();
          for (var i = 0; i < names.length; i++)
            if (hash.toLowerCase() == names[i].toString().toLowerCase())
              return this._getValidPageLengths()[i];
          return DEFAULT_PAGE_LENGTH;
        },

        encode: function (pageLengthParam) {
          if (pageLengthParam == DEFAULT_PAGE_LENGTH)
            return '';
          var values = this._getValidPageLengths();
          for (var i = 0; i < values.length; i++)
            if (values[i] == pageLengthParam)
              return this._getPageLengthNames()[i].toString().toLowerCase();
          return '';
        }
      });

      var pageLengthHashFragment = new PageLengthHashFragment(table);

      var PageIndexHashFragment = Class({
        decode: function (hash) {
          if (hash == '')
            return 0;
          var index = parseInt(hash) - 1;
          if (index >= 0)
            return index;
          return 0;
        },

        encode: function (indexParam) {
          if (indexParam == 0)
            return '';
          return (indexParam + 1).toString();
        }
      });

      var pageIndexHashFragment = new PageIndexHashFragment();

      var currentStateHash = null;

      var $input = $('.dataTables_filter :input[type=search]');

      var inputChanged = function () {
        if (($input.val() || '') == '') {
          $input.removeClass('active');
          $input.width('5em' /* TODO: this guesswork should go to CSS definition */);
        } else {
          $input.addClass('active');
          $input.width($input.textWidth());
        }
      }

      // reconfigure the input field so that it does not filter/sort/draw the datatable after
      // every keypress. Exactly same function is provided by DataTables plugin
      // http://www.datatables.net/plug-ins/api/fnSetFilteringDelay
      // Following code builds upon the plugin concept. Basically it does 'undo' of the
      // input field capture code at
      // https://github.com/DataTables/DataTables/blob/1.10.0/media/js/jquery.dataTables.js#L2664
      // and reschedules it using a timer for little bit after and adds a temporary '.busy' css
      // decorator to the search field
      {
        var oldTimerId = null;

        // as there is not public jQuery method to inspect the event handlers we're using
        // peek into the internal jQuery structures as suggested here
        // http://stackoverflow.com/a/13018025/2626313
        var oldEventHandler = ($._data($input[0], "events")['keyup'])[0].handler;

        $input.off('keyup.DT search.DT input.DT paste.DT cut.DT').on('keyup.DT search.DT input.DT paste.DT cut.DT', function () {
          var sender = this;
          $(sender).addClass('busy');
          window.clearTimeout(oldTimerId);
          oldTimerId = window.setTimeout(function () {
            $(sender).removeClass('busy');

            layoutChanged();

            oldEventHandler.apply(sender);

            inputChanged();
          }, 300 /* TODO: TUNE: put here some 'nice' number */
          );
        });
      }

      var resizeColumns = function (tableApi, columnWidths) {
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
        };
        layoutChanged();
        tableApi.draw();

        sticky.unlock(StickyController.TABLE_HEADER);
        sticky.lock(StickyController.TABLE_HEADER);
      };

      var applyFilter = function (tableApi, value, newPageIndex) {
        if (value != null) {
          $input.val(value);
        }

        inputChanged();

        // as a side-effect of this call should be the call to saveState()
        tableApi = tableApi.search($input.val());

        var resetPosition = true;

        if (newPageIndex != null) {
          tableApi = tableApi.page(newPageIndex);
          resetPosition = false;
        }
        tableApi.draw(resetPosition);
      };

      var saveState = function () {
        var originalTop = $(window).scrollTop();
        try {
          var orderParam = orderHashFragment.encode(table.order());

          // default order will not be saved in the hash fragment
          if (orderParam == orderHashFragment.encode(DEFAULT_ORDER))
            orderParam = '';

          var pageLengthParam = pageLengthHashFragment.encode(table.page.len());

          var pageIndexParam = pageIndexHashFragment.encode(table.page());

          var hash = HashFragment.encode({ 's': $input.val(), 't': tags.getFilteredArray(), 'a': avatars.getFilteredArray(), 'o': orderParam, 'p': pageIndexParam, 'l': pageLengthParam });

          if (HashFragment.equals(hash, currentStateHash)) {
            // nothing to do
            return;
          }

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

          currentStateHash = hash;
        } finally {
          $(window).scrollTop(originalTop);
        }
      };

      window.tagClick = function (element) {
        var self = $(element);

        tags.toggle(self.data('tag'), self.data('hash'));

          // hide the cloud selector on tag-select
        window.tagControllerClick(false);

        saveState();

        layoutChanged();

          // filter the data table
        table.draw();
      };

      window.avatarClick = function (element) {
        var self = $(element);

        avatars.toggle(self.data('avatar'), self.data('hash'));

        // hide the cloud selector on tag-select
        window.avatarControllerClick(false);

        saveState();

        layoutChanged();

        // filter the data table
        table.draw();
      };

      // handle all changes triggered internally or through UI
      // this might be alternatively monitored on the $input element through 'input' and 'keyup' events
      // http://datatables.net/forums/discussion/21284/how-to-detect-when-filter-field-gets-cleared-by-the-x-button-click
      $(tableId).on('search.dt', saveState);

      // Respond to page-length changes
      $(tableId).on('length.dt', function () {
        layoutChanged();
        saveState();
      });

      // Respond to page-index changes
      $(tableId).on('page.dt', function () {
        saveState();
      });

      $(tableId).on('draw.dt', function () {
        updateLayout();
      });

      var gotoState = function (hash) {
        if (!(typeof (hash) == "string"))
          hash = window.location.hash;

        if (HashFragment.equals(hash, currentStateHash)) {
          // nothing to do
          return;
        }

        var hashParams = HashFragment.decode(hash);

        tags.activate(hashParams['t']);
        avatars.activate(hashParams['a']);
        var pageLength = pageLengthHashFragment.decode(hashParams['l'] || '');
        var pageIndex = pageIndexHashFragment.decode(hashParams['p'] || '');
        var orderParam = hashParams['o'] || '';
        var tableApi;
        if (orderParam == '')
          tableApi = table.order(DEFAULT_ORDER);
        else
          tableApi = table.order(orderHashFragment.decode(orderParam));
        if (pageLength != table.page.len())
          tableApi = tableApi.page.len(pageLength);
        var newPageIndex = null;
        if (pageIndex != table.page())
          newPageIndex = pageIndex;
        applyFilter(tableApi, hashParams['s'] || '', newPageIndex);
      };

      // hashchange (HTML4) seems to be the only really cross-browser compatible way how to make
      // some sort of hash fragment history work. Especially when the local 'file:' mode is needed
      $(window).on('hashchange', gotoState);

      sticky.lock();

      inputChanged();

      gotoState();

      // If there are no filters set through the url (tags, avaters, full text) then put focus to the input
      // field - hinting user to enter full text filter
      var hashParams = HashFragment.decode(currentStateHash);
      if (((hashParams['t']|| '') + (hashParams['a'] || '') + (hashParams['s'] || '')) == '') {
        $input.focus();
        // make whole above screen part visible
        $(window).scrollTop(0);
      }
    }
  );
});

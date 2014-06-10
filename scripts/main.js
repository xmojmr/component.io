"use strict";
$(document).ready(function () {
  var sorry = function (res) {
    var problem = '';
    if (res instanceof Error) {
      problem = res.message.toString();
    } else {
      if (res.error) {
        problem = res.message.toString();
        if (res.status) {
          problem += ", Status: " + res.status.toString();
        }
      }
    }
    $('#error').text($('#error').text() + problem);
    $('#loading').hide();
    $('#error').show();
  }
  window.superagent
    // using this link causes CORS problems e.g. with Opera Mobile or Opera for Windows v 12.17
    //.get('http://component-crawler.herokuapp.com/.json')
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
        var data = [];
      
        var getUtcDate = function(d) {
          return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        };
      
        // http://stackoverflow.com/a/13371349/2626313
        var escapeHtml = (function () {
          var chr = {
            '"': '&quot;', '&': '&amp;', "'": '&#39;',
            '/': '&#47;',  '<': '&lt;',  '>': '&gt;'
          };
          return function (text) {
            return text.replace(/[\"&'\/<>]/g, function (a) { return chr[a]; });
          };
        }());
      
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
        var COLUMN_LICENSE = 11;
        var COLUMN_WATCHERS = 12;

        var SELECTOR_AUTHOR = '.author';
        var SELECTOR_COMPONENT = '.component';
        var SELECTOR_VERSION = '.version';
        var SELECTOR_DESCRIPTION = '.description';
        var SELECTOR_LICENSE = '.license';
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

          constructor: function (className, htmlJoinOperator) {
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

          set: function(key, propertyName, propertyValue) {
            var bag = this._properties[key] || {};
            if (propertyValue == null)
              delete bag[propertyName];
            else
              bag[propertyName] = propertyValue;
            this._properties[key] = bag;
          },

          get: function(key, propertyName) {
            var bag = this._properties[key];
            if (bag == null)
              return null;
            return bag[propertyName];
          },

          _sort: function () {
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

          createHtml: function(t, attributes, size) {
            var active = '';
            var hash = this.$class.hash(t);
            if (this._filteredHashes[hash])
              active = ' active';
            return '<span class="' + this._className + active + '" onclick="' + this._className + 'Click(this)"' + (attributes || '') + ' data-hash="' + hash + '" data-' + this._className + '="' + t + '">' + this._getText(t, size) + '</span>';
          },

          createCloudHtml: function (fontSizeRanges) {
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
            , this).join(" ");
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
            $('#' + this._className + '-filter').html(this._filteredArray.map(this.createHtml, this).join(this._htmlJoinOperator));

            this._filteredHashedArray = this._filteredArray.map(function (t) { return SEPARATOR + tagHash(t) + SEPARATOR; });
          },

          activate: function (filter) {
            filter = filter || [];
            if (!(filter instanceof Array))
              filter = [filter];

            // turn-off all previous tag filters
            while (this._filteredArray.length > 0)
              this.toggle(this._filteredArray[0]);

            for (var i = 0; i < filter.length; i++)
              this.toggle(filter[i]);
          }
        });

        var Tags = Class(Cloud, {
          constructor: function () {
            Cloud.call(this, 'tag', ' && ');
          }
        });

        var tags = new Tags();

        var Avatars = Class(Cloud, {
          constructor: function () {
            Cloud.call(this, 'avatar', ' || ');
          },

          isMatch: function (hashes) {
            // row is accepted only if it contains ANY of the avatar hashes
            for (var i = this._filteredHashedArray.length - 1; i >= 0; i--) {
              if (hashes.indexOf(this._filteredHashedArray[i]) >= 0)
                return true;
            }
            return false;
          },

          _getText: function (t, size) {
            return this.createImageHtml(t, size) + this.$class.$superp._getText.call(this, t);
          },

          createImageHtml: function (key, size) {
            var gravatar = this.get(key, PROPERTY_GRAVATAR);
            if (gravatar != null) {
              if (size == null) {
                size = "32";
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
          }
        });

        var avatars = new Avatars();

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
              licenses = component.license.toString().split('/');
            
            for (var l = 0; l < licenses.length; l++) {
              keywords.push('license-' + licenses[l].trim());
            }
          }
        
          keywords.sort(function(a,b) {
            return a.localeCompare(b);
          });
        
          for (var k = 0; k < keywords.length; k++) {
            tags.add(keywords[k]);
          }

          var author = component.repo.substr(0, j);

          if (avatars.add(author, (component.github.stargazers_count || 0) - (10 /* one open issue removes 10 stars */ *(component.github.open_issues_count || 0)))) {
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
            component.github.stargazers_count  || '',
            // COLUMN_AGE
            Math.floor((now - getUtcDate(new Date(component.github.created_at))) / milisecondsPerDay),
            // COLUMN_ISSUES
            component.github.open_issues_count  || '',
            // COLUMN_FRESHNESS
            Math.floor((now - getUtcDate(new Date(component.github.updated_at))) / milisecondsPerDay),
            // COLUMN_VERSION
            component.version || '',
            // COLUMN_FORKS
            component.github.forks  || '',
            // COLUMN_LICENSE
            component.license || '',
            // COLUMN_WATCHERS
            component.github.watchers_count || ''
          ]);
        }
      } catch (error) {
        sorry(error);
        return;
      }
     
      $('#tags').html(tags.createCloudHtml([0.8, 2.5]) /* TUNE: font size range */);

      $('#avatars').html(avatars.createCloudHtml([0.8, 1, 3]) /* TUNE: font size range */);
      
      var table = $('table').DataTable({
        data: data,
        pagingType: 'full_numbers',
        pageLength: 100,
        processing: true,
        autoWidth: false,
        deferRender: true,
        columns: [
          //  COLUMN_AUTHOR
          {
            'className': SELECTOR_AUTHOR.substr(1),
            'type': 'string',
            'orderData': [COLUMN_AUTHOR, COLUMN_COMPONENT],
            'width': '10%'
          },
          // COLUMN_COMPONENT
          {
            'className': SELECTOR_COMPONENT.substr(1),
            'type': 'string',
            'width': '15%'
          },
          // COLUMN_DESCRIPTION
          {
            'className': SELECTOR_DESCRIPTION.substr(1),
            'type': 'string',
            'sortable': false,
            'width': '30%'
          },
          // COLUMN_TAGS
          {
            'className': SELECTOR_TAGS.substr(1),
            'type': 'string',
            'sortable': false,
            'width': '15%'
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
            'width': '5%',
            'searchable': false
          },
          // COLUMN_AGE
          {
            'className': SELECTOR_AGE.substr(1),
            'type': 'numeric',
            'width': '5%',
            'searchable': false
          },
          // COLUMN_ISSUES
          {
            'className': SELECTOR_ISSUES.substr(1),
            'type': 'numeric',
            'width': '5%',
            'searchable': false
          },
          // COLUMN_FRESHNESS
          {
            'className': SELECTOR_FRESHNESS.substr(1),
            'type': 'numeric',
            'width': '5%',
            'searchable': false
          },
          // COLUMN_VERSION
          {
            'className': SELECTOR_VERSION.substr(1),
            'type': 'string',
            'width': '5%'
          },
          // COLUMN_FORKS
          {
            'className': SELECTOR_FORKS.substr(1),
            'type': 'numeric',
            'width': '5%',
            'searchable': false
          },
          // COLUMN_LICENSE
          {
            'className': SELECTOR_LICENSE.substr(1),
            'type': 'string'
            // license is included in the tag column. No need to display it twice
            , 'visible': false,
            'searchable': false
          },
          // COLUMN_WATCHERS
          {
            'className': SELECTOR_WATCHERS.substr(1),
            'type': 'numeric'
             // TODO: enable once the crawler bug
             // https://github.com/component/crawler.js/issues/5
             // gets fixed
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
          
          $r.find(SELECTOR_COMPONENT).html('<a href="https://github.com/' + repo + '" class="external" target="_blank" title="' + repo + '">' + data[COLUMN_COMPONENT] + '</a>');

          if (data[COLUMN_ISSUES] != '') {
            $r.find(SELECTOR_ISSUES).html('<a href="https://github.com/' + repo + '/issues" class="external" target="_blank">' + data[COLUMN_ISSUES] + '</a>');
          }
          
          $r.find(SELECTOR_TAGS).html(data[COLUMN_TAGS].map(tags.createHtml, tags).join(" "));
          
          $r.find(SELECTOR_VERSION).attr("title", data[COLUMN_VERSION]);
        },
        // http://datatables.net/reference/option/dom
        'dom': '<"fixed-scroll-header"<"filter"f><"top"lip>>rt'
      });
      
      $('.dataTables_filter').append($('#tags-controller'));
      $('.dataTables_filter').append($('#avatars-controller'));
      
      // hide loading indicator and show so far hidden elements
      $('#loading').toggle();
      $('.invisible').removeClass('invisible');

      // hide tag clould
      $("#tags").toggle();
      $("#avatars").toggle();

      var fixedHeader;
      var updateFixedHeader;

      window.tagControllerClick = function (visible) {
        if (visible == null) {
          $("#tags").toggle();
        } else if (visible) {
          $("#tags").show()
        } else {
          $("#tags").hide();
        }
        // reposition fixed header
        updateFixedHeader();
      };

      window.avatarControllerClick = function (visible) {
        if (visible == null) {
          $("#avatars").toggle();
        } else if (visible) {
          $("#avatars").show()
        } else {
          $("#avatars").hide();
        }
        // reposition fixed header
        updateFixedHeader();
      };

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

      /*
      // build fixed table headers
      fixedHeader = new $.fn.dataTable.FixedHeader(table, {
        // TODO: workaround for https://github.com/DataTables/FixedHeader/issues/29
        alwaysCloneTop: true
      });
      updateFixedHeader = function() { fixedHeader.fnUpdate(); };
      */
      fixedHeader = $('table').stickyTableHeaders({
        fixedOffset: $('.fixed-scroll-header'),
            leftOffset: 1 /* TODO: ??? */
      });
      updateFixedHeader = function () {
        $(window).trigger('resize.stickyTableHeaders');
        $('.fixed-scroll-header').trigger('sticky_kit:recalc');
        $('.fixed-scroll-header').stick_in_parent();
      };
      $('.fixed-scroll-header').stick_in_parent();

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

        constructor: function(table) {
          this._table = table;
        },

        _getColumnNames: function() {
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
            if (sortDirection == ' ' +OrderHashFragment.DEFAULT_SORT_DIRECTION)
              sortDirection = '';
            result.push(columnNames[orderParam[i][0]] + sortDirection);
          }
          return result.join(',');
        }
      });

      var orderHashFragment = new OrderHashFragment(table);

      var currentStateHash = null;

      var $input = $('.dataTables_filter :input[type=search]').focus();

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
            oldEventHandler.apply(sender);
            }, 300 /* TODO: TUNE: put here some 'nice' number */
          );
        });
      }

      var applyFilter = function(tableApi, value) {
        if (value != null) {
          $input.val(value);
        }

        // as a side-effect of this call should be the call to saveState()
        tableApi.search($input.val()).draw();
      };
    
      var saveState = function () {
        var orderParam = orderHashFragment.encode(table.order());

        // default order will not be saved in the hash fragment
        if (orderParam == orderHashFragment.encode(DEFAULT_ORDER))
          orderParam = '';

        var hash = HashFragment.encode({ 's': $input.val(), 't': tags.getFilteredArray(), 'a': avatars.getFilteredArray(), 'o': orderParam });

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
      };

      window.tagClick = function (element) {
        var self = $(element);

        tags.toggle(self.data('tag'), self.data('hash'));

        // hide the cloud selector on tag-select
        window.tagControllerClick(false);

        saveState();

        // filter the data table
        table.draw();
      };

      window.avatarClick = function (element) {
        var self = $(element);

        avatars.toggle(self.data('avatar'), self.data('hash'));

        // hide the cloud selector on tag-select
        window.avatarControllerClick(false);

        saveState();

        // filter the data table
        table.draw();
      };

      // handle all changes triggered internally or through UI
      // this might be alternatively monitored on the $input element through 'input' and 'keyup' events
      // http://datatables.net/forums/discussion/21284/how-to-detect-when-filter-field-gets-cleared-by-the-x-button-click
      $('table').on('search.dt', saveState);

      var gotoState = function (hash) {
        if (!(typeof(hash) == "string"))
          hash = window.location.hash;

        if (HashFragment.equals(hash, currentStateHash)) {
          // nothing to do
          return;
        }

        var hashParams = HashFragment.decode(hash);

        tags.activate(hashParams['t']);
        avatars.activate(hashParams['a']);
        var orderParam = hashParams['o'] || '';
        var tableApi;
        if (orderParam == '')
          tableApi = table.order(DEFAULT_ORDER);
        else
          tableApi = table.order(orderHashFragment.decode(orderParam));
        applyFilter(tableApi, hashParams['s'] || '');
      };

      // hashchange (HTML4) seems to be the only really cross-browser compatible way how to make
      // some sort of hash fragment history work. Especially when the local 'file:' mode is needed
      $(window).on('hashchange', gotoState);

      gotoState();
    }
  );
});

"use strict";
$(document).ready(function () {
  $.getJSON(
    'http://component-crawler.herokuapp.com/.json',
    null,
    function( json ) {
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

      var tagWeights = {};

      var tagHash = function (t) {
        return t.toLowerCase();
      };

      var now = getUtcDate(new Date());
      var milisecondsPerDay = 24 * 60 * 60 * 1000;
      var n = json.components.length;
      var maxTagWeight = 0;
      var minTagWeight = n;
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
          var tag = keywords[k];
          tagWeights[tag] = (tagWeights[tag] || 0) + 1;
        }

        var TAG_SEPARATOR = ';'; // TODO: use some distinct character that certainly is not present in the hash code

        data.push([
          //  COLUMN_AUTHOR
          component.repo.substr(0, j),
          // COLUMN_COMPONENT
          component.repo.substr(j + 1),
          // COLUMN_DESCRIPTION
          escapeHtml(component.description || ''), // TODO: is the escaping really needed? is this the right place?
          // COLUMN_TAGS
          keywords,
          // COLUMN_TAGS_HASH
          TAG_SEPARATOR + (keywords || []).map(tagHash).join(TAG_SEPARATOR) + TAG_SEPARATOR,
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
          component.github.watchers_count  || ''
        ]);
      }
      
      var tags = [];
      for (var tag in tagWeights) {
        var tagWeight = tagWeights[tag];
        if (tagWeight > maxTagWeight)
          maxTagWeight = tagWeight;
        if (tagWeight < minTagWeight)
          minTagWeight = tagWeight;
        tags.push({ tag: tag, weight: tagWeight });
      }
       
      if (minTagWeight > maxTagWeight)
        minTagWeight = maxTagWeight;
 
      tags.sort(function(a,b) {
        return a.tag.localeCompare(b.tag);
      });
      
      var tagSizes = {};
      
      // TUNE:
      var minFontSize = 12;
      var maxFontSize = 40;
      
      var filteredTagsHashes = {};
      var filteredTagsArray = [];
      var filteredTagsHashedArray = [];

      var createTag = function (t, attributes) {
        var active = '';
        var hash = tagHash(t);
        if (filteredTagsHashes[hash])
          active = ' active';
        return '<span class="tag' + active + '" onclick="tagClick(this)"' + (attributes || '') + ' data-hash="' + tagHash(t) + '" data-tag="' + t + '">' + escapeHtml(t) + '</span>';
      };

      var tagHtml = tags.map(
        function(t) {
          var fontSize = tagSizes[t.weight];
          if (fontSize == null) {
            if (t.weight == minTagWeight)
              fontSize = minFontSize;
            else
              fontSize = ((Math.log(t.weight) / Math.log(maxTagWeight)) * (maxFontSize - minFontSize)) + minFontSize;

            fontSize = ' style="font-size:' + fontSize + 'px;"';
        
            tagSizes[t.weight] = fontSize;
          }
        
          var title = '';
          if (t.weight > 1)
            title = ' title="x ' + t.weight.toString() + '"';
          return createTag(t.tag, fontSize + title);
        }
      ).join(" ");
      
      tagSizes = null;
      
      $('#tags').html(tagHtml);
      
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
            'visible': false
          },
          // COLUMN_STARS
          {
            'className': SELECTOR_STARS.substr(1),
            'type': 'numeric',
            'width': '5%'
          },
          // COLUMN_AGE
          {
            'className': SELECTOR_AGE.substr(1),
            'type': 'numeric',
            'width': '5%'
          },
          // COLUMN_ISSUES
          {
            'className': SELECTOR_ISSUES.substr(1),
            'type': 'numeric',
            'width': '5%'
          },
          // COLUMN_FRESHNESS
          {
            'className': SELECTOR_FRESHNESS.substr(1),
            'type': 'numeric',
            'width': '5%'
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
            'width': '5%'
          },
          // COLUMN_LICENSE
          {
            'className': SELECTOR_LICENSE.substr(1),
            'type': 'string'
            // license is included in the tag column. No need to display it twice
            ,'visible': false
          },
          // COLUMN_WATCHERS
          {
            'className': SELECTOR_WATCHERS.substr(1),
            'type': 'numeric'
             // TODO: enable once the crawler bug
             // https://github.com/component/crawler.js/issues/5
             // gets fixed
            ,'visible': false
          }
        ],
        'order': [COLUMN_FRESHNESS, 'asc'],
        rowCallback: function (tr, data) {
          var $r = $(tr);
          
          var author = data[COLUMN_AUTHOR];
          
          $r.find(SELECTOR_AUTHOR).html('<a href="https://github.com/' + author + '" class="external" target="_blank" title="' + author + '">' + author + '</a>');

          var repo = data[COLUMN_AUTHOR] + '/' + data[COLUMN_COMPONENT];
          
          $r.find(SELECTOR_COMPONENT).html('<a href="https://github.com/' + repo + '" class="external" target="_blank" title="' + repo + '">' + data[COLUMN_COMPONENT] + '</a>');

          if (data[COLUMN_ISSUES] != '') {
            $r.find(SELECTOR_ISSUES).html('<a href="https://github.com/' + repo + '/issues" class="external" target="_blank">' + data[COLUMN_ISSUES] + '</a>');
          }
          
          $r.find(SELECTOR_TAGS).html(data[COLUMN_TAGS].map(createTag).join(" "));
          
          $r.find(SELECTOR_VERSION).attr("title", data[COLUMN_VERSION]);
        },
        // http://datatables.net/reference/option/dom
        'dom': '<"filter"f><"top"lip>rt<"bottom"lip>'
      });
      
      $('.dataTables_filter').append($('#tags-controller'));
      
      // hide loading indicator and show so far hidden elements
      $('#loading').toggle();
      $('.invisible').removeClass('invisible');

      // hide tag clould
      $("#tags").toggle();

      var fixedHeader;

      window.tagControllerClick = function (visible) {
        if (visible == null) {
          $("#tags").toggle();
        } else if (visible) {
          $("#tags").show()
        } else {
          $("#tags").hide();
        }
        // reposition fixed header
        fixedHeader.fnUpdate();
      };

      $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
        if (filteredTagsHashedArray.length == 0) {
          return true;
        } else {
          // row is accepted only if it contains ALL tags
          var hashes = data[COLUMN_TAGS_HASH];
          for (var i = filteredTagsHashedArray.length - 1; i >= 0; i--) {
            if (hashes.indexOf(filteredTagsHashedArray[i]) < 0)
              return false;
          }
          return true;
        }
      });

      // build fixed table headers
      fixedHeader = new $.fn.dataTable.FixedHeader(table, {
        // TODO: workaround for https://github.com/DataTables/FixedHeader/issues/29
        alwaysCloneTop: true
      });

      // inspired by http://stackoverflow.com/a/21350778/2626313
      var decodeHashParams = function(a) {
        if (!a) return {};
        a = a.split('#')[1 /* analyze the part after hash */].split('&');
        var b = a.length, c = {}, d, k, v;
        while (b--) {
          d = a[b].split('=');
          k = d[0].replace('[]', ''), v = decodeURIComponent(d[1] || '');
          c[k] ? typeof c[k] === 'string' ? (c[k] = [v, c[k]]) : (c[k].unshift(v)) : c[k] = v;
        }
        return c
      };

      var encodeHashParams = function (params) {
        var encode = function (key, value) {
          return key + '=' + encodeURIComponent(value).replace('+', /%20/g);
        };

        var query = [];
        for (var key in params)
          if (params.hasOwnProperty(key)) {
            var value = params[key];
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
      }

      var $input = $('.dataTables_filter :input[type=search]').focus();
    
      var applyFilter = function(value) {
        if (value != null) {
          $input.val(value);
        }
        table.search($input.val()).draw();
      };
    
      var updateHistory = function () {
        var hash = encodeHashParams({ 's': $input.val(), 't': filteredTagsArray });
        if ((history.location || window.location).hash != hash) {
          window.history.pushState(null, null, hash || '#');
        }
        window.location.hash = hash;
      };

      var toggleTag = function (tag, hash) {
        if (hash == null)
          hash = tagHash(tag);

        if (filteredTagsHashes[hash]) {
          delete filteredTagsHashes[hash];
          $('.tag').filter('[data-hash="' + hash + '"]').removeClass('active');
          filteredTagsArray = filteredTagsArray.filter(function (t) { return tagHash(t) != hash; });
        } else {
          filteredTagsHashes[hash] = true;
          $('.tag').filter('[data-hash="' + hash + '"]').addClass('active');
          filteredTagsArray.push(tag);
        }

        // show selected tags to the user
        filteredTagsArray.sort(function (a, b) {
          return a.localeCompare(b);
        });
        $('#tag-filter').html(filteredTagsArray.map(createTag).join(" "));

        filteredTagsHashedArray = filteredTagsArray.map(function (t) { return TAG_SEPARATOR + tagHash(t) + TAG_SEPARATOR; });
      };

      window.tagClick = function (element) {
        var self = $(element);

        toggleTag(self.data('tag'), self.data('hash'));

        // hide the cloud selector on tag-select
        window.tagControllerClick(false);

        updateHistory();

        // filter the data table
        table.draw();
      };

      $input.keyup(function (e) {
        if (e.keyCode === 27) {
          applyFilter('');
        }
        updateHistory();
      });
    
      var applyState = function () {
        var hash = decodeHashParams((history.location || window.location).hash);
        var tags = hash['t'] || [];
        if (!(tags instanceof Array))
          tags = [tags];

        // turn-off all previous tag filters
        while (filteredTagsArray.length > 0)
          toggleTag(filteredTagsArray[0]);

        for (var i = 0; i < tags.length; i++)
          toggleTag(tags[i]);
        applyFilter(hash['s'] || '');

        updateHistory();
      };

      // hashchange is THE ONLY WTF way how to make history work in IE11 (as far as I have found after several hours of web search after debugging attempts failed. Damn you IE developers)
      $(window).on('hashchange', applyState);

      applyState();
    }
  );
});

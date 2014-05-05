"use strict";
$(document).ready(function() {
  $.getJSON(
    'http://component-crawler.herokuapp.com/.json',
    null,
    function( json ) {
      var aaData = [];
      
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
      var COLUMN_STARS = 4;
      var COLUMN_AGE = 5;
      var COLUMN_ISSUES = 6;
      var COLUMN_FRESHNESS = 7;
      var COLUMN_VERSION = 8;
      var COLUMN_FORKS = 9;
      var COLUMN_LICENSE = 10;
      var COLUMN_WATCHERS = 11;

      var SELECTOR_AUTHOR = '.author';
      var SELECTOR_COMPONENT = '.component';
      var SELECTOR_VERSION = '.version';
      var SELECTOR_DESCRIPTION = '.description';
      var SELECTOR_LICENSE = '.license';
      var SELECTOR_TAGS = '.tags';
      var SELECTOR_FORKS = '.forks';
      var SELECTOR_ISSUES = '.issues';
      var SELECTOR_STARS = '.stars';
      var SELECTOR_WATCHERS = '.watchers';
      var SELECTOR_AGE = '.age';
      var SELECTOR_FRESHNESS = '.freshness';

      var tagWeights = {};
      var maxTagWeight = 0;

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
          var tag = keywords[k];
          tagWeights[tag] = (tagWeights[tag] || 0) + 1;
        }

        aaData.push([
          //  COLUMN_AUTHOR
          component.repo.substr(0, j),
          // COLUMN_COMPONENT
          component.repo.substr(j + 1),
          // COLUMN_DESCRIPTION
          escapeHtml(component.description || ''), // TODO: is the escaping really needed? is this the right place?
          // COLUMN_TAGS
          keywords,
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
        tags.push({ tag: tag, weight: tagWeight });
      }
        
      tags.sort(function(a,b) {
        return a.tag.localeCompare(b.tag);
      });
      
      $('#tags').html(
        tags.map(function(t) {
          var weight = '';
          if (t.weight > 1)
            weight = '<span class="tag-count">&nbsp;x&nbsp;' + t.weight.toString() + '</span>';
          return '<span class="tag">' + t.tag + '</span>' + weight;
        }).join(" ")
      );
      
      var $table = $('table').dataTable({
        aaData: aaData,
        bLengthChange: false,
        sPaginationType: 'full_numbers',
        iDisplayLength: 100 + 1,
        //lengthChange: true,
        bProcessing: true,
        bAutoWidth: false,
        bDeferRender: true,
        aoColumns: [
          //  COLUMN_AUTHOR
          {
            sClass: SELECTOR_AUTHOR.substr(1),
            sType: 'string',
            aDataSort: [COLUMN_AUTHOR, COLUMN_COMPONENT],
            sWidth: '10%'
          },
          // COLUMN_COMPONENT
          {
            sClass: SELECTOR_COMPONENT.substr(1),
            sType: 'string',
            sWidth: '15%'
          },
          // COLUMN_DESCRIPTION
          {
            sClass: SELECTOR_DESCRIPTION.substr(1),
            sType: 'string',
            bSortable: false,
            sWidth: '30%'
          },
          // COLUMN_TAGS
          {
            sClass: SELECTOR_TAGS.substr(1),
            sType: 'string',
            bSortable: false,
            sWidth: '15%'
          },
          // COLUMN_STARS
          {
            sClass: SELECTOR_STARS.substr(1),
            sType: 'numeric',
            sWidth: '5%'
          },
          // COLUMN_AGE
          {
            sClass: SELECTOR_AGE.substr(1),
            sType: 'numeric',
            sWidth: '5%'
          },
          // COLUMN_ISSUES
          {
            sClass: SELECTOR_ISSUES.substr(1),
            sType: 'numeric',
            sWidth: '5%'
          },
          // COLUMN_FRESHNESS
          {
            sClass: SELECTOR_FRESHNESS.substr(1),
            sType: 'numeric',
            sWidth: '5%'
          },
          // COLUMN_VERSION
          {
            sClass: SELECTOR_VERSION.substr(1),
            sType: 'string',
            sWidth: '5%'
          },
          // COLUMN_FORKS
          {
            sClass: SELECTOR_FORKS.substr(1),
            sType: 'numeric',
            sWidth: '5%'
          },
          // COLUMN_LICENSE
          {
            sClass: SELECTOR_LICENSE.substr(1),
            sType: 'string'
            // license is included in the tag column. No need to display it twice
            ,bVisible: false
          },
          // COLUMN_WATCHERS
          {
            sClass: SELECTOR_WATCHERS.substr(1),
            sType: 'numeric'
             // TODO: enable once the crawler bug
             // https://github.com/component/crawler.js/issues/5
             // gets fixed
            ,bVisible: false
          }
        ],
        fnRowCallback: function (tr, data) {
          var $r = $(tr);
          
          var author = data[COLUMN_AUTHOR];
          
          $r.find(SELECTOR_AUTHOR).html('<a href="https://github.com/' + author + '" class="external" target="_blank" title="' + author + '">' + author + '</a>');

          var repo = data[COLUMN_AUTHOR] + '/' + data[COLUMN_COMPONENT];
          
          $r.find(SELECTOR_COMPONENT).html('<a href="https://github.com/' + repo + '" class="external" target="_blank" title="' + repo + '">' + data[COLUMN_COMPONENT] + '</a>');

          if (data[COLUMN_ISSUES] != '') {
            $r.find(SELECTOR_ISSUES).html('<a href="https://github.com/' + repo + '/issues" class="external" target="_blank">' + data[COLUMN_ISSUES] + '</a>');
          }
          
          $r.find(SELECTOR_TAGS).html(data[COLUMN_TAGS].map(function(t) { return '<span class="tag">' + t + '</span>' }).join(" "));
        }
      }).fnSetFilteringDelay(300);
      
      new $.fn.dataTable.FixedHeader($table);
      
      // hide loading indicator and show so far hidden elements
      $('#loading').toggle();
      $('.invisible').removeClass('invisible');
    
      var $input = $(':input[type=text]').focus();
    
      $input.keyup(function (e) {
        if (e.keyCode === 27) {
          $table.fnFilter('');
          $input.val('');
          $input.click();
        }
        if (window.location.hash.length > 1) {
          window.History.replaceState({}, '', '#' + $input.val());
        }
        window.location.hash = $input.val();
      });
    
      var hash = window.location.hash.slice(1);
      if (hash.length > 0) {
        hash = decodeURIComponent(hash);
        $input.val(hash);
        $table.fnFilter($input.val());
      } else {
        $input.val('');
        $table.fnFilter('');
      }
    }
  );
});

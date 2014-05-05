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
      
      var COLUMN_AUTHOR = 0;
      var COLUMN_COMPONENT = 1;
      var COLUMN_VERSION = 2;
      var COLUMN_DESCRIPTION = 3;
      var COLUMN_LICENSE = 4;
      var COLUMN_TAGS = 5;
      var COLUMN_FORKS = 6;
      var COLUMN_ISSUES = 7;
      var COLUMN_STARS = 8;
      var COLUMN_WATCHERS = 9;
      var COLUMN_AGE = 10;
      var COLUMN_FRESHNESS = 11;

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
          component.repo.substr(0, j),
          component.repo.substr(j + 1),
          component.version || '',
          component.description || '',
          component.license || '',
          keywords,
          component.github.forks  || '',
          component.github.open_issues_count  || '',
          component.github.stargazers_count  || '',
          component.github.watchers_count  || '',
          Math.floor((now - getUtcDate(new Date(component.github.created_at))) / milisecondsPerDay),
          Math.floor((now - getUtcDate(new Date(component.github.updated_at))) / milisecondsPerDay)
        ]);
      }
      
      var tags = [];
      for (var tag in tagWeights)
        tags.push({ tag: tag, weight: tagWeights[tag] });
        
      tags.sort(function(a,b) {
        return a.tag.localeCompare(b.tag);
      });
      
      $('#tags').html(
        tags.map(function(t) {
          return '<span class="tag">' + t.tag + ' (' + t.weight + ')</span>';
        }).join(" ")
      );
      
      var $table = $('table').dataTable({
        aaData: aaData,
        bLengthChange: false,
        sPaginationType: 'full_numbers',
        iDisplayLength: 21,
        bProcessing: true,
        bAutoWidth: false,
        bDeferRender: true,
        aoColumns: [
          //  COLUMN_AUTHOR
          { sClass: SELECTOR_AUTHOR.substr(1), sType: 'string', aDataSort: [COLUMN_AUTHOR, COLUMN_COMPONENT] },
          // COLUMN_COMPONENT
          { sClass: SELECTOR_COMPONENT.substr(1), sType: 'string' },
          // COLUMN_VERSION
          { sClass: SELECTOR_VERSION.substr(1),  sType: 'string' },
          // COLUMN_DESCRIPTION
          { sClass: SELECTOR_DESCRIPTION.substr(1), sType: 'string', bSortable: false },
          // COLUMN_LICENSE
          { sClass: SELECTOR_LICENSE.substr(1), sType: 'string'
            // license is included in the tag column. No need to display it twice
            ,bVisible: false
          },
          // COLUMN_TAGS
          { sClass: SELECTOR_TAGS.substr(1), sType: 'string', bSortable: false },
          // COLUMN_FORKS
          { sClass: SELECTOR_FORKS.substr(1), sType: 'numeric' },
          // COLUMN_ISSUES
          { sClass: SELECTOR_ISSUES.substr(1), sType: 'numeric' },
          // COLUMN_STARS
          { sClass: SELECTOR_STARS.substr(1), sType: 'numeric' },
          // COLUMN_WATCHERS
          { sClass: SELECTOR_WATCHERS.substr(1), sType: 'numeric'
             // TODO: enable once the crawler bug
             // https://github.com/component/crawler.js/issues/5
             // gets fixed
            ,bVisible: false
          },
          // COLUMN_AGE
          { sClass: SELECTOR_AGE.substr(1), sType: 'numeric' },
          // COLUMN_FRESHNESS
          { sClass: SELECTOR_FRESHNESS.substr(1), sType: 'numeric' }
        ],
        fnRowCallback: function (tr, data) {
          var $r = $(tr);
          
          $r.find(SELECTOR_AUTHOR).html('<a href="https://github.com/' + data[COLUMN_AUTHOR] + '" target="_blank">' + data[COLUMN_AUTHOR] + '</a>');

          $r.find(SELECTOR_COMPONENT).html('<a href="https://github.com/' + data[COLUMN_AUTHOR] + '/' + data[COLUMN_COMPONENT] + '" target="_blank">' + data[COLUMN_COMPONENT] + '</a>');

          if (data[COLUMN_ISSUES] != '') {
            $r.find(SELECTOR_ISSUES).html('<a href="https://github.com/' + data[COLUMN_AUTHOR] + '/' + data[COLUMN_COMPONENT] + '/issues" target="_blank">' + data[COLUMN_ISSUES] + '</a>');
          }
          
          $r.find(SELECTOR_TAGS).html(data[COLUMN_TAGS].map(function(t) { return '<span class="tag">' + t + '</span>' }).join(" "));
    
          // $c.eq(COLUMN_DESCRIPTION).attr('title', data[COLUMN_DESCRIPTION]);

          /*
          $c.eq(0).html('<a title="' + data[7] + '" href="https://www.npmjs.org/package/' + data[0] + '" target="_blank">' + data[0] + '</a>');
    
          if (data[1]) {
            var name = data[1].split('/');
            $c.eq(1).html('<a href="https://github.com/' + data[1] + '" target="_blank">' + name[name.length - 1] + '</a>');
          }
    
          $c.eq(2).prop('title', data[2]);
    
            var author = data[3].split(';');
            $c.eq(3).html('<a href="' + author[0] + '" target="_blank">' + author[1] + '</a>');
          */
        }
      }).fnSetFilteringDelay(300);
    
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

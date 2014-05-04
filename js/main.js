$(document).ready(function() {
  $.getJSON(
    /* 'component-crawler.json' */
    'http://component-crawler.herokuapp.com/.json'
    ,
    null,
    function( json ) {
      var aaData = json.components;
      
      var $table = $('table').dataTable({
        aaData: aaData,
        columns: [
          { data: "name" },
          { data: "repo" },
          { data: "version" },
          { data: "description" },
          { data: "license" },
          { data: "keywords[,]" },
          { data: "github.forks" },
          { data: "github.open_issues_count" },
          { data: "github.stargazers_count" },
          { data: "github.watchers_count" },
          { data: "github.updated_at" }
        ],
        bLengthChange: false,
        sPaginationType: 'full_numbers',
        iDisplayLength: 21,
        bProcessing: true,
        bAutoWidth: false,
        bDeferRender: true,
        fnRowCallback: function (tr, data) {
          var $c = $(tr).children();
          // TODO: link           { github.url

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

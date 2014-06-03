component.io
============

Search tool for JavaScript [components](https://github.com/component/guide).

This is **experimental testing version** of proposal for new site design for the <http://component.io> searchable repository. The design was created as [Nipster](https://github.com/eirikb/nipster)-clone
modified to work with [Component Crawler](https://github.com/component/crawler.js) as data source.


Go and check <http://xmojmr.github.io/component.io/>

### Current Status (2014-06-02)
- ok
 - Display of crawler.js database using searchable sortable jQuery DataTables works.
 - Columns author, component and issues are clickable.
 - Tag cloud is calculated correctly (shown on button click)
 - Author cloud filter (with gravatar images) is available on button click. Projects with many open issues are given less weight
 - Clicking on tags (anywhere on the screen) swithes their include/exclude filtering status
 - Search and sort and tag and author query generates stateful hash fragments (bookmarkable urls)
 - Search filter is sticked to the top of the screen
- not ok
 - ugly
 - slow initialization
 - does not work on mobile clients (e.g. Opera Mobile)
 

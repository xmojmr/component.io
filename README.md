component.io
============

This is search tool for modular JavaScript [component](https://github.com/component/guide') framework. The component framework was invented by [TJ Holowaychuk](https://github.com/visionmedia')

I have created the search tool because I was not able to find anything useful with the official ```http://component.io``` search tool

My version of the search tool is available online at <http://component.xmojmr.cz/> under [WTFPL](http://en.wikipedia.org/wiki/WTFPL) license

You can use

- ```multi-column``` ```sorting``` by author, component, number of stars GitHub users assigned to it, age in days, number of open issues, freshness in days, version number, number of forks
- ```full-text search``` in description, tags, author name, component name
- ```tag =``` cloud filter, multiple selected tags allow for narrowing down the search
- ```author =``` cloud filter, authors are up-weighted by number of projects, number of stars and down-weighted by number of open issues. Multiple selected authors allow for filtering a group of popular vendors
- Each query is represented by ```bookmarkable url```

Original design was inspired by [Nipster](https://github.com/eirikb/nipster), modified to work with [Component Crawler](https://github.com/component/crawler.js) as data source.

### Current Status (2014-07-03)
- Maturity
 - (+) no serious known bugs on modern desktop browsers
 - (+) stable bookmarkable url API
 - (+) usable (full text search, tag search, author search..)
 - (-) slow and not reliable on low-end mobile devices
- Details (+)
 - Display of crawler.js database using searchable sortable jQuery DataTables works.
 - Columns author, component and issues are clickable.
 - Tag cloud is calculated correctly (shown on button click)
 - Author cloud filter (with gravatar images) is available on button click. Projects with many open issues are given less weight
 - Clicking on tags (anywhere on the screen) swithes their include/exclude filtering status
 - Search and sort and tag and author query generates stateful hash fragments (bookmarkable urls)
 - Search filter is sticked to the top of the screen
 - 1st version of REST API available
 - user interface pixel-aligned, colorized and split into 2 different responsive layouts
 - server configured to use gzip compression where possible
 - crawler.js dataset contains only subset really used by the application
- Details (-)
 - all data processing is done in the client's browser. This causes significant delay on mobile devices
 - default 100 rows page length is too heavy to layout and render on low-end mobile processors
 - calculation of screen dimensions does not work reliably in portrait layout on mobile devices
 - some functions (e.g. cloud display) does not work as designed in Opera Mobile browser, Android 2.3 browser
 
### 3rd party credits (A→Z)
- Allane Jardine for [jQuery DataTables](http://www.datatables.net/)
- Digital Zoom Studio for [Calculate Text Width with jQuery](http://digitalzoomstudio.net/2013/06/19/calculate-text-width-with-jquery/)
- [Icons8](http://icons8.com/)
- Jack Moore for [jQuery Modal Tutorial](http://www.jacklmoore.com/notes/jquery-modal-tutorial/)
- Jonas Mosbech for [StickyTableHeaders](https://github.com/jmosbech/StickyTableHeaders)
- [jQuery](http://jquery.com/)
- leafo for [sticky-kit](https://github.com/leafo/sticky-kit)
- LearnBoost for [Stylus](https://github.com/LearnBoost/stylus)
- Mozilla for [Nunjucks](https://github.com/mozilla/nunjucks)
- Ryan McGeary for [timeago](http://timeago.yarp.com/)
- Tan Nhu for [JSFace OOP library](https://github.com/tnhu/jsface)
- TJ Holowaychuk for [superagent](https://github.com/visionmedia/superagent)

### Internal API
#### GET /api/v1/crawler.json

Returns component crawler.js JSON dataset as described in <https://github.com/component/crawler.js#get-json>

#### POST /api/v1/crawler/updates

Payload ignored. Triggers cache update of the crawler.json dataset from the <http://component-crawler.herokuapp.com/> server

### Changelog
- Release 1.0.0
 - original raw look was colorized. There are two different table layouts at the breakpoint of horizontal screen size 1150 pixels
 - moved to xmojmr's site build system
- Release 0.3.0
 - not as slow as used to be, Opera Mobile CORS problems solved by hosting on a server with PHP backend
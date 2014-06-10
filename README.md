component.io
============

Search tool for JavaScript [components](https://github.com/component/guide).

This is **experimental testing version** of proposal for new site design for the ```component.io``` searchable repository. The design was created as [Nipster](https://github.com/eirikb/nipster)-clone
modified to work with [Component Crawler](https://github.com/component/crawler.js) as data source.

Go and check <http://component.xmojmr.cz/>

### Current Status (2014-06-10)
- Maturity
 - (+) no known bugs
 - (+) stable bookmarkable url API
 - (+) usable (full text search, tag search, author search..)
 - (-) ugly  
- Details (+)
 - Display of crawler.js database using searchable sortable jQuery DataTables works.
 - Columns author, component and issues are clickable.
 - Tag cloud is calculated correctly (shown on button click)
 - Author cloud filter (with gravatar images) is available on button click. Projects with many open issues are given less weight
 - Clicking on tags (anywhere on the screen) swithes their include/exclude filtering status
 - Search and sort and tag and author query generates stateful hash fragments (bookmarkable urls)
 - Search filter is sticked to the top of the screen
 - 1st version of REST API available
- Details (-)
 - ugly, even more ugly on mobile devices (no responsive CSS)
 - slow initialization
 
### Changelog
- Release 0.3.0
 - not as slow as used to be, Opera Mobile CORS problems solved by hosting on a server with PHP backend

### How to fork for hosting in your own environment
- in ```index.html``` modify canonical url and script for automatic browser-side redirection to the canonical url
- If your webserver is not Apache, replicate logic in ```api/v1/.htaccess``` (enables gzip + cache control for crawler.json) and in ```api/v1/crawler/.htaccess``` (activates PHP script for handling the ```POST api/v1/crawler/updates```)


### Internal API
#### GET /api/v1/crawler.json

Returns component crawler.js JSON dataset as described in <https://github.com/component/crawler.js#get-json>

#### POST /api/v1/crawler/updates

Payload ignored. Triggers cache update of the crawler.json dataset from the <http://component-crawler.herokuapp.com/> server


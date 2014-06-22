// Inspired by http://www.jacklmoore.com/notes/jquery-modal-tutorial/
var modal = (function () {
  var 
  method = {},
  $overlay,
  $modal,
  $content,
  $close,
  _settings;

  // Center the modal in the viewport
  method.center = function () {
    var top, left;

    top = Math.max($(window).height() - $modal.outerHeight(), 0) / 2;
    left = Math.max($(window).width() - $modal.outerWidth(), 0) / 2;

    $modal.css({
      top:top + $(window).scrollTop(), 
      left:left + $(window).scrollLeft()
    });
  };

  // Open the modal
  method.open = function (settings) {
    _settings = settings;
    $content.empty().append(settings.content);

    $modal.css({
      width: settings.width || 'auto', 
      height: settings.height || 'auto'
    });

    method.center();
    $(window).bind('resize.modal', method.center);

    $modal.show();
    $content.scrollTop(0);

    $overlay.show();
  };

  // Close the modal
  method.close = function () {
    if (_settings == null)
      return;

    $modal.hide();
    $overlay.hide();
    $content.empty();
    $(window).unbind('resize.modal');
    var onClose = _settings.onClose;
    _settings = null;

    if (onClose)
      onClose();
  };

  // Generate the HTML and add it to the document
  $overlay = $('<div id="modal-overlay"></div>');
  $modal = $('<div id="modal-modal"></div>');
  $content = $('<div id="modal-content"></div>');
  $close = $('<a id="modal-close" href="#">close</a>');

  $modal.hide();
  $overlay.hide();
  $modal.append($content, $close);

  $(document).ready(function(){
    $('body').append($overlay, $modal);            
  });

  $close.click(function(e){
    e.preventDefault();
    method.close();
  });

  return method;
}());
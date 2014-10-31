// Inspired by http://digitalzoomstudio.net/2013/06/19/calculate-text-width-with-jquery/
jQuery.fn.textWidth = function(){
    var _t = jQuery(this);
    var html_org = _t.html();
    if(_t[0].nodeName=='INPUT'){
        html_org = _t.val();
    }
    var html_calcS = '<span>' + html_org + '</span>';
    jQuery('body').append(html_calcS);
    var _lastspan = jQuery('span').last();
    //console.log(_lastspan, html_calc);
    _lastspan.css({
        'font-size' : _t.css('font-size')
        ,'font-family' : _t.css('font-family')
        ,'font-weight' : _t.css('font-weight')
    });
    var width =_lastspan.width() + 5;
    //_t.html(html_org);
    _lastspan.remove();
    return width;
};
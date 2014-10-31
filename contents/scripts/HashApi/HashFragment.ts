/// <reference path="../typings/IHashFragment.d.ts" />

class HashFragment {
  // inspired by http://stackoverflow.com/a/21350778/2626313
  static decode(hash: string): IHashParams {
    if (!hash) return {};
    var hashes = hash.split('#')[1 /* analyze the part after hash */].split('&');
    var b = hashes.length, c: IHashParams = {}, d: string[], k: string, v: string;
    while (b--) {
      d = hashes[b].split('=');
      k = d[0].replace('[]', '');
      v = decodeURIComponent(d[1] || '');
      c[k] ? typeof c[k] === 'string' ? (c[k] = [v, c[k]]) : (c[k].unshift(v)) : c[k] = v;
    }
    return c;
  }

  static encode(hashParams: IHashParams): string {
    function encode(key: string, value: string): string {
      return key + '=' + encodeURIComponent(value).replace(new RegExp('\\+', 'g'), '%20');
    }

    var query: string[] = [];
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
  }

  static normalize(hash: string): string {
    if (hash == null)
      return '';
    if (hash == '' || hash == '#')
      return '';
    return hash;
  }

  static equals(a: string, b: string): boolean {
    return HashFragment.normalize(a) == HashFragment.normalize(b);
  }
}

export = HashFragment;
 
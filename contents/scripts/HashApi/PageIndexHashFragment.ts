class PageIndexHashFragment {
  decode(hash: string): number {
    if (hash == '')
      return 0;
    var index = parseInt(hash) - 1;
    if (index >= 0)
      return index;
    return 0;
  }

  encode(indexParam: number): string {
    if (indexParam == 0)
      return '';
    return (indexParam + 1).toString();
  }
}

export = PageIndexHashFragment;
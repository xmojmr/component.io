/// <reference path="../typings/IDataTableEx.d.ts" />

class OrderHashFragment {
  static DEFAULT_SORT_DIRECTION = 'asc';

  private _table: IDataTableEx;

  constructor(table: IDataTableEx) {
    this._table = table;
  }

  private _getColumnNames(): string[] {
    var result: string[] = [];
    var tableColumns = this._table.settings()[0].aoColumns;
    for (var i = 0; i < tableColumns.length; i++) {
      var column = tableColumns[i];
      result[i] = column.className;
    }
    return result;
  }

  decode(hash: string): IColumnOrder[] {
    var params = hash.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t != ''; });
    var result: IColumnOrder[] = [];
    for (var i = 0; i < params.length; i++) {
      var param = params[i].split(' ');
      var columnName = param[0];
      var columnIndex = this._getColumnNames().indexOf(columnName);
      if (columnIndex >= 0) {
        result.push(<IColumnOrder><any[]>[columnIndex, param[1] || OrderHashFragment.DEFAULT_SORT_DIRECTION]);
      }
    }
    return result;
  }

  encode(orderParam: IColumnOrder[]): string {
    var result: string[] = [];
    var columnNames = this._getColumnNames();
    for (var i = 0; i < orderParam.length; i++) {
      var sortDirection = ' ' + orderParam[i][1];
      if (sortDirection == ' ' + OrderHashFragment.DEFAULT_SORT_DIRECTION)
        sortDirection = '';
      result.push(columnNames[orderParam[i][0]] + sortDirection);
    }
    return result.join(',');
  }
}

export = OrderHashFragment;
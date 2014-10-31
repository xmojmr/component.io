/// <reference path="../../../templates/vendor/borisyankov/DefinitelyTyped/jquery/jquery.d.ts" />

interface JQuery {
  DataTable: (options: any) => IDataTableEx;
}

interface IColumnOrder {
  [index: number]: any;  // TODO: [0]: number - column index, [1]: string - ascending or descending indicator
}

interface IDataTableEx {
  context: any;
  settings: () => {
    [index: number]: {
      aoColumns: {
        [index: number]: {
          className: string
        }
        length: number
      }
      aLengthMenu: {
        [index: number]:
          any[] /* TODO: [0] - number[] - page lengths, [1] - string[] - page length name */
      }
    }
  }
  column: (index: number) => {
    visible(value: boolean): IDataTableEx;
  }
  draw(resetPosition?: boolean): void;
  search(pattern: string): IDataTableEx;
  page: {
    (newPageIndex: number): IDataTableEx;
    (): number;
    len: {
      (): number;
      (value: number): IDataTableEx;
    }
  }
  order: {
    (): IColumnOrder[];
    (value: IColumnOrder[]): IDataTableEx;
  }
}
 
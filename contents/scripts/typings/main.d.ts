/// <reference path="IDataTableEx.d.ts" />

interface JQuery {
  timeago: () => void;
  textWidth: () => number;
}

interface JQueryStatic {
  _data: any;
}

interface Window {
  tagControllerClick: () => void;
  tagClick: (element: Element) => void;
  avatarControllerClick: () => void;
  avatarClick: (element: Element) => void;
}
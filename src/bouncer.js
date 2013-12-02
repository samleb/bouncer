/*! Bouncer v0.2.0-alpha, Copyright (c) 2008-2012 Samuel Lebeau */
(function(GLOBAL, document, undefined) {
  "use strict";
  
  var Bouncer = { };
  
  var SELECTORS_CACHE = { },
      UNIQUE_ID = 0,
      A_ELEMENT = document.createElement("a"),
      UPPERCASE_TAG_NAMES = A_ELEMENT.tagName === "A",
      HAS_GET_ELEMENTS_BY_CLASS_NAME = A_ELEMENT.getElementsByClassName;
  
  //= require "helpers"
  //= require "tokenizer"
  //= require "filters"
  //= require "selectors"
  
  function getElementsBySelector(expression, context) {
    var selector = SELECTORS_CACHE[expression];
    if (!selector) {
      selector = createSelector(expression);
      SELECTORS_CACHE[expression] = selector;
    }
    return selector(context || document);
  }
  
  Bouncer.createFilter = createFilter;
  Bouncer.createSelector = createSelector;
  Bouncer.getElementsBySelector = getElementsBySelector;
  
  GLOBAL.Bouncer = Bouncer;
})(this, document);

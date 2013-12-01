//= require "selectors/base"
//!= require "selectors/x_path"

var SELECTORS = {
  "#": createIdSelector,
  ".": createClassNameSelector,
  "*": createTagNameSelector,
  "[": createAttributeSelector,
  ":": createPseudoSelector
};

var SELECTORS_SYMBOLS_PRIORITY = "#.*[:";

if (!A_ELEMENT.getElementsByClassName) {
  SELECTORS_SYMBOLS_PRIORITY = "#*.[:";
  SELECTORS["."] = function(className) {
    return createSelectorFromFilter(createClassNameFilter(className));
  };
}

function createSelector(expression) {
  // if (SELECTORS_API_SUPPORTED) {
  //   try {
  //     A_ELEMENT.querySelector(expression);
  //     return createSelectorUsingQuerySelectorAll(expression);
  //   } catch(e) { }
  // }
  // if (X_PATH_SUPPORTED) {
  //   return createSelectorUsingXPath(expression);
  // }
  var result = Tokenizer.tokenize(expression);
  map(result, createSelectorFromTokens);
  return createSelectorFromGroupSelectors(result);
}

function createSelectorFromFilter(filter) {
  var select = createSelector("*");
  return function selectorFromFilter(context) {
    return filter(select(context));
  };
}

function createSelectorUsingQuerySelectorAll(expression) {
  return function(context) {
    return context.querySelectorAll(expression);
  };
}

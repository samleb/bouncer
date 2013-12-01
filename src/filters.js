//= require "filters/base"
//= require "filters/combinators"
//= require "filters/pseudos"

function createFilter(expression) {
  var tokens = Tokenizer.tokenize(expression)[0];
  return createFilterFromTokens(tokens);
};

function createFilterFromTokens(tokens) {
  var filters = [],
      i = tokens.length,
      token;
  
  if (i === 0) return IDENTITY;
  
  while (token = tokens[--i]) {
    if (token.symbol in COMBINATORS) {
      var filter = createFilterFromTokens(tokens.slice(0, i));
      filters.push(COMBINATORS[token.symbol](filter));
      break;
    } else {
      filters.push(createFilterFromToken(token));
    }
  }
  
  if (filters.length === 1) return filters[0];
  
  filters.reverse();
  
  return function filter(elements) {
    var i = filters.length;
    while (i--) {
      elements = filters[i](elements);
    }
    return elements;
  };
}

function createFilterFromToken(token) {
  return FILTERS[token.symbol].apply(null, token.captures);
}

var FILTERS = {
  "#": createIdFilter,
  ".": createClassNameFilter,
  "*": createTagNameFilter,
  "[": createAttributeFilter,
  ":": createPseudoFilter
};

var COMBINATORS = {
  " ": createCombinatorFactory("parentNode", true),
  ">": createCombinatorFactory("parentNode", false),
  "~": createCombinatorFactory("previousSibling", true),
  "+": createCombinatorFactory("previousSibling", false)
};

var PSEUDO_FILTERS = {
  "first-child": firstChildPseudoFilter,
  "last-child": lastChildPseudoFilter,
  "only-child": onlyChildPseudoFilter,
  "empty": emptyPseudoFilter,
  "enabled": enabledPseudoFilter,
  "disabled": disabledPseudoFilter,
  "checked": checkedPseudoFilter
};

var PSEUDO_FILTERS_WITH_ARGUMENTS = {
  "not": createNotPseudoFilter,
  "contains": createContainsPseudoFilter
};

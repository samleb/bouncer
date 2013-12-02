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

function createSelectorFromTokens(tokens) {
  var seedToken    = findSeedToken(tokens),
      pivot        = indexOf(tokens, seedToken),
      filterTokens = tokens.slice(0, pivot),
      seedSelector = createSelectorFromToken(seedToken),
      token,
      filter,
      combinator,
      restMatcher,
      restSelector,
      restFilter;
  
  while ((token = tokens[++pivot]) && !(token.symbol in COMBINATORS)) {
    filterTokens.push(token);
  }
  
  filter = createFilterFromTokens(filterTokens);
  
  if (token) {
    tokens = tokens.slice(pivot + 1);
    
    if (token.symbol === " ") {
      restSelector = createSelectorFromTokens(tokens);
    } else {
      combinator = createSelectorCombinator(token);
      restFilter = createFilterFromTokens(tokens);
    }
  }
  
  return function selector(context) {
    var result = filter(seedSelector(context));
    
    if (combinator) {
      result = restFilter(combinator(result));
    
    } else if (restSelector) {
      var contexts = result,
          i = 0,
          elements,
          context;
      result = [];
      while (context = contexts[i++]) {
        elements = restSelector(context);
        result.push.apply(result, elements.constructor === Array ? elements : toArray(elements));
      }
    }
    
    return result;
  };
}

/**
 *  Returns the most discriminative token
 *
 *      #navigation ul li
 *      ^ 
 *      .list .first a
 *            ^
**/
function findSeedToken(tokens) {
  var i = 0, j, symbol, token;
  
  while (symbol = SELECTORS_SYMBOLS_PRIORITY.charAt(i++)) {
    // if (symbol === "*") {
    //   j = 0;
    //   while (token = tokens[j++]) {
    //     if (token.symbol === symbol) break;
    //   }
    // } else {
      j = tokens.length;
      while (token = tokens[--j]) {
        if (token.symbol === symbol) break;
      }
    // }
    if (token) break;
  }
  
  return token;
}

function createSelectorFromToken(token) {
  return SELECTORS[token.symbol].apply(null, token.captures);
}

function createSelectorFromGroupSelectors(selectors) {
  if (selectors.length === 1) return selectors[0];
  return function(context) {
    var result = [], selector, i = 0;
    while (selector = selectors[i++]) {
      result.push.apply(result, toArray(selector(context)));
    }
    return result.sort(comparePosition);
  }
}

var SELECTOR_COMBINATORS = {
  " ": { dir: "parentNode",                           fol: true },
  ">": { dir: "parentNode",      down: "firstChild"             },
  "+": { dir: "previousSibling", down: "nextSibling"            },
  "~": { dir: "previousSibling", down: "nextSibling", fol: true }
};

function createSelectorCombinator(token) {
  var symbol = token.symbol,
      combinator = SELECTOR_COMBINATORS[symbol],
      direction = combinator.down,
      follow = combinator.fol;
  
  if (symbol === ">") {
    follow = true;
  }
  
  return function(elements) {
    var result = [], i = 0, e;
    while (e = elements[i++]) {
      if (!(e = e[direction])) continue;
      do {
        if (e.nodeType === 1) {
          result.push(e);
          if (!follow) break;
        }
      } while (e = e.nextSibling);
    }
    return result;
  };
}

function createTagNameSelector(tagName) {
  return function tagNameSelector(context) {
    return context.getElementsByTagName(tagName);
  };
}

function createIdSelector(id) {
  return function(context) {
    var candidate = (context.ownerDocument || context).getElementById(id);
    if (candidate && context.documentElement || isDescendantOf(candidate, context)) {
      return [candidate];
    } else {
      return [];
    }
  };
}

function createClassNameSelector(className) {
  return function(context) {
    return context.getElementsByClassName(className);
  };
}

function createAttributeSelector(name, operator, argument) {
  return createSelectorFromFilter(createAttributeFilter(name, operator, argument));
}

function createPseudoSelector(name, argument) {
  return createSelectorFromFilter(createPseudoFilter(name, argument));
}

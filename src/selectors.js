var createClassNameSelector = HAS_GET_ELEMENTS_BY_CLASS_NAME ? 
  createClassNameSelector_usingGetElementsByClassName :
  createClassNameSelector_usingClassNameFilter;

var SELECTORS = {
  "#": createIdSelector,
  ".": createClassNameSelector,
  "*": createTagNameSelector,
  "[": createAttributeSelector,
  ":": createPseudoSelector
};

var SELECTORS_SYMBOLS_PRIORITY = HAS_GET_ELEMENTS_BY_CLASS_NAME ? "#.*[:" : "#*.[:";

function createSelector(expression) {
  var result = Tokenizer.tokenize(expression);
  map(result, createSelectorFromTokens);
  return createSelectorFromGroupSelectors(result);
}

function createSelectorFromFilter(filter) {
  return function selectorFromFilter(context) {
    return filter(context.getElementsByTagName("*"));
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
      restFilter = createFilterFromTokens(tokens);
      
      var combinatorTokens = [token];
      for (var i = 0, t; t = tokens[i]; i++) {
        if (t.symbol in COMBINATORS) combinatorTokens.push(t)
      }
      
      combinator = composeFunctions(map(combinatorTokens, createSelectorCombinator));
    }
  }
  
  return function selector(context) {
    var result = filter(seedSelector(context));
    
    if (combinator) {
      result = restFilter(combinator(result));
    
    } else if (restSelector) {
      var i = 0,
          parents = result,
          children,
          element;
      result = [];
      while (element = parents[i++]) {
        children = restSelector(context);
        result.push.apply(result, children);
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
    j = tokens.length;
    while (token = tokens[--j]) {
      if (token.symbol === symbol) break;
    }
    if (token) break;
  }
  
  return token;
}

function createSelectorFromToken(token) {
  return SELECTORS[token.symbol].apply(undefined, token.captures);
}

function createSelectorFromGroupSelectors(selectors) {
  if (selectors.length === 1) return selectors[0];
  
  return function(context) {
    var result, selector, i = 1;
    
    result = selectors[0](context);
    
    while (selector = selectors[i++]) {
      result.push.apply(result, selector(context));
    }
    
    return result.sort(comparePosition);
  }
}

var SELECTOR_COMBINATORS = {
  ">": { dir: "firstChild",  fol: true },
  "+": { dir: "nextSibling"            },
  "~": { dir: "nextSibling", fol: true }
};

function createSelectorCombinator(token) {
  var symbol = token.symbol;
  if (symbol === " ") return allChildrenCombinator;
  
  var combinator = SELECTOR_COMBINATORS[symbol],
      direction = combinator.dir,
      follow = combinator.fol;
  
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

function allChildrenCombinator(elements) {
  var result = [], i = 0, element;
  
  while (element = elements[i++]) {
    result.push.apply(result, getElementsBySelector("*", element));
  }
  
  return result;
}

function createTagNameSelector(tagName) {
  return function tagNameSelector(context) {
    // FIXME: _slice could be avoided here
    return _slice.call(context.getElementsByTagName(tagName));
  };
}

function createIdSelector(id) {
  return function idSelector(context) {
    return [(context.ownerDocument || context).getElementById(id)];
  };
}

function createClassNameSelector_usingGetElementsByClassName(className) {
  return function classNameSelector(context) {
    // FIXME: _slice could be avoided here
    return _slice.call(context.getElementsByClassName(className));
  };
}

function createClassNameSelector_usingClassNameFilter(className) {
  return createSelectorFromFilter(createClassNameFilter(className));
}

function createAttributeSelector(name, operator, argument) {
  return createSelectorFromFilter(createAttributeFilter(name, operator, argument));
}

function createPseudoSelector(name, argument) {
  return createSelectorFromFilter(createPseudoFilter(name, argument));
}

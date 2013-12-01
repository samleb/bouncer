function createCombinatorFactory(direction, follow) {
  return function createCombinator(filter) {
    return function combinator(elements) {
      var result = [],
          i = 0,
          element;
      
      while (element = elements[i++]) {
        var relatives = [],
            relative = element;
        
        while (relative = relative[direction]) {
          if (relative.nodeType === 1) {
            relatives.push(relative);
            if (!follow) break;
          }
        }
        
        if (filter(relatives).length > 0) {
          result.push(element);
        }
      }

      return result;
    };
  };
}


var Scanner = (function() {
  
  var Patterns = {
    tagName:    /^(\*|[\w\-]+)/,
    combinator: /^\s*([\>\+\~\s\,])\s*/,
    
    "#": /^#([\w\-\*]+)(?:\b|$)/,
    ".": /^\.([\w\-\*]+)(?:\b|$)/,
    "[": /^\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]=|=)\s*(?:(['"])([^\3]*?)\3|([^'"][^\]]*?)))?\]/,
    ":": /^:(\w[\w-]*)(?:\((.*?)\))?(?:\b|$|(?=\s|[:+~>]))/
  };
  
  var Error = { };

  function scan(expr, handler) {
    var m, chr, fire;
    
    function advance(pattern) {
      if ((m = expr.match(pattern))) {
        expr = expr.slice(m.shift().length);
      }
      return m;
    }
    
    fire = (typeof handler === "function")
      ? function(symbol) { handler.call(null, symbol, m); }
      : function(symbol) { handler[symbol].apply(handler, m); };
    
    while (expr) {
      if (advance(Patterns.combinator)) fire(m[0]);
      if ((chr = expr[0]) in Patterns && advance(Patterns[chr])) {
        if (chr === "[") {
          if (m[2]) m[4] = m[3];  // if quotes are present, value is in m[3].
          m = [m[0], m[1], m[4]]; // -> [name, operator, value]
        }
        fire(chr);
      }
      else if (advance(Patterns.tagName)) fire("*");
      else throw Error;
    }
  }

  return {
    Error: Error,
    scan:  scan
  };

})();

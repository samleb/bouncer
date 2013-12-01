# Bouncer

Bouncer is a partial, opiniated and blazing fast implementation of [CSS3 Selectors](http://www.w3.org/TR/selectors) in JavaScript.

It's main purpose is to help building better web applications by maximizing the use of event-delegation, while interfacing with your JavaScript library of choice.

This is currently a work in progress, and more shall be expected soon.

## TODO

- Replace ERB "Macros" by JavaScript/Coffeescript
- Replace Sprockets by CommonJS modules in combination with a client-side loader / build-system
- Implement a lean Parser/AST
- Introduce basic CSS "Algebra"
- Decouple Tokenization & Parsing from browser implementation (thus allowing server-side unit tests)
- Create a Github Page for the project, evangelising event-delegation (still...) & demonstrating its performance (SlickSpeed ?)

Bouncer is released under the MIT license.
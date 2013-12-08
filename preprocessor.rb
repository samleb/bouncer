# (c) Copyright 2009-2013 Samuel Lebeau. All Rights Reserved. 
require 'erb'

module Bouncer
  module JavaScriptMacros
    class FilterFunction
      attr_reader :name, :condition, :options
      
      DEFAULT_OPTIONS = {
        :condition_variable => 'condition',
        :element_variable => 'element'
      }
      
      def initialize(name, condition_or_options = {}, &block)
        @name = name
        @options = DEFAULT_OPTIONS
        if block_given?
          @options = @options.merge(condition_or_options)
          @condition = block
        else
          @condition = condition_or_options
        end
      end

      def render(template)
        template << opening
        render_condition(template)
        template << closing
      end
      
      def opening()
%"function #{name}Filter(elements) {
    var __i__ = 0,
        __result__ = [],
        #{variables.join(', ')};
    while (#{element_variable} = elements[__i__++]) {
      if (#{element_variable}.nodeType !== 1) continue;
"
      end
      def closing()
%"
      if (#{condition_variable}) {
        __result__.push(#{element_variable});
      }
    }
    return __result__;
  }"
      end

      def render_condition(template)
        if condition.is_a?(Proc)
          condition.call
        else
          template << "      "
          template << "#{condition_variable} = #{condition};"
        end
      end

      protected
        def variables
          [condition_variable, element_variable, options[:variables]].flatten.compact
        end
        
        def condition_variable
          options[:condition_variable]
        end
        
        def element_variable
          options[:element_variable]
        end
    end
    
    def filter_function(*args, &block)
      FilterFunction.new(*args, &block).render(self)
    end
  end

  class Preprocessor < ERB
    include JavaScriptMacros
    
    def self.preprocess(input)
      new(input).result
    end
  
    def initialize(input)
      super(input, nil, nil, "@buffer")
    end
    
    def append_git_hash
      self << `git rev-parse HEAD`.chop!
    end
  
    def <<(string)
      @buffer << string
    end
  
    def result
      super(binding)
    end
  end
end

if __FILE__ == $PROGRAM_NAME
  print Bouncer::Preprocessor.new(DATA.read).result
end

__END__

<% filter_function :attribute, :condition_variable => "c" do %>
  var v = e.getAttribute(name);
  if (v !== null) {
    switch (operator) {
      case "=": c = v === arg; break;
      case "!": c = v !== arg; break; // Convenient addition, "[a!=b]" := ":not([a=b])"
      case "^": c = v.indexOf(arg) === 0; break;
      case "$": c = v.length - arg.length >= 0 && v.lastIndexOf(arg) === v.length - arg.length; break;
      case "*": c = v.indexOf(arg) !== -1; break;
      case "~": c = arg.test(v); break;
      case "|": c = (v = v.toLowerCase()) === arg || v.indexOf(arg + "-") === 0; break;
    }
  }
<% end %>

<% filter_function :emptyPseudo, "!element.firstChild" %>

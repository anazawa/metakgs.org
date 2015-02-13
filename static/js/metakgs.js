/*
 *  MetaKGS.js (https://github.com/anazawa/metakgs.org)
 *  Copyright 2014 Ryo Anazawa
 *  Licensed under MIT
 */

var MetaKGS = {};

if ( typeof jQuery === "undefined" ) { throw "jquery.js is required"; }

if ( typeof window.console === "undefined" ) {
  window.console = {
    log   : function () {},
    warn  : function () {},
    error : function () {}
  };
}

(function () {
  'use strict';

  var Util = {};

  /*
   *  Copied and rearranged from:
   *  https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_Expressions
   */

  Util.escapeRegExp = function(string) {
    return string.replace( /([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1" );
  };

  Util.commify = function (string) {
    return string.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  Util.foreach = function (array, callback) {
    var i, last, length = array.length;
    for ( i = 0; i < length && !last; i++ ) {
      last = callback(array[i], i) === false;
    }
  };

  Util.keys = function (object) {
    var keys = [];
    var key;

    for ( key in object ) {
      if ( object.hasOwnProperty(key) ) {
        keys.push( key );
      }
    }

    return keys;
  };

  Util.ucfirst = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  Util.isNumber = function (value) {
    return typeof value === 'number' && isFinite(value);
  };

  Util.isInteger = function (value) {
    return Util.isNumber(value) && Math.floor(value) === value;
  };

  Util.isString = function (value) {
    return typeof value === 'string';
  };

  /*
   *  Stopwatch object to calculate response times
   */

  Util.Stopwatch = {
    startedAt: null,
    elapsedTime: 0,
    start: function() {
      if ( !this.startedAt ) {
        this.startedAt = new Date();
      }
    },
    stop: function() {
      var now = new Date();
      if ( this.startedAt ) {
        this.elapsedTime += now.getTime() - this.startedAt.getTime();
        this.startedAt = null;
      }
    },
    reset: function() {
      this.startedAt = null;
      this.elapsedTime = 0;
    },
    getElapsedTime: function() {
      var now = new Date();
      if ( this.startedAt ) {
        return this.elapsedTime + now.getTime() - this.startedAt.getTime();
      }
      else {
        return this.elapsedTime;
      }
    }
  };

  MetaKGS.Util = Util;

}());

(function () {
  'use strict';

  var ucfirst = MetaKGS.Util.ucfirst;

  /* a wrapper around jQuery */

  var Element = function (args) {
    var spec = args || {};

    var that = {
      $context       : spec.$context       || $(),
      namespace      : spec.namespace      || '',
      eventNamespace : spec.eventNamespace || 'metakgs',
      activeClass    : spec.activeClass    || '+active',
      disabledClass  : spec.disabledClass  || '+disabled',
      hideClass      : spec.hideClass      || '+hide'
    };

    that.classNameFor = function (name) {
      var className = name.replace(/^\+/, '');
      var prefix = this.namespace ? this.namespace+'-' : '';
      return className === name ? prefix+className : className;
    };

    that.eventNameFor = function (name) {
      return name.match(/\./) ? name : name+'.'+this.eventNamespace;
    };

    that.eventNamespaceFor = function (name) {
      return this.eventNamespace ? this.eventNamespace+ucfirst(name) : name;
    };

    that.addClass = function (className) {
      this.$context.addClass( this.classNameFor(className) );
    };

    that.removeClass = function (className) {
      this.$context.removeClass( this.classNameFor(className) );
    };

    that.show = function () {
      this.removeClass( this.hideClass );
    };

    that.hide = function () {
      this.addClass( this.hideClass );
    };

    that.setActive = function (bool) {
      if ( bool ) {
        this.addClass( this.activeClass );
      }
      else {
        this.removeClass( this.activeClass );
      }
    };

    that.setDisabled = function (bool) {
      if ( bool ) {
        this.addClass( this.disabledClass );
      }
      else {
        this.removeClass( this.disabledClass );
      }
    };

    that.setText = function (text) {
      this.$context.text( text );
    };

    that.setAttr = function (key, value) {
      this.$context.attr( key, value );
    };

    that.getData = function (key) {
      return this.$context.data( key );
    };

    that.on = function (eventName, callback) {
      this.$context.on( this.eventNameFor(eventName), callback );
    };

    that.off = function (eventName) {
      this.$context.off( this.eventNameFor(eventName) );
    };

    that.find = function (name) {
      return Element({
        $context       : this.$context.find( '.'+this.classNameFor(name) ),
        namespace      : this.classNameFor( name ),
        eventNamespace : this.eventNamespaceFor( name ),
        activeClass    : this.activeClass,
        disabledClass  : this.disabledClass,
        hideClass      : this.hideClass
      });
    };

    return that;
  };

  MetaKGS.Element = Element;

}());

(function () {
  'use strict';

  var foreach = MetaKGS.Util.foreach;

  var Component = function (args) {
    var spec = args || {};
    var that = spec.context ? Object.create(spec.context) : MetaKGS.Element(spec);

    that.render = function (args) {
      throw new Error("call to abstract method 'render'");
    };

    that.clear = function (args) {
      throw new Error("call to abstract method 'clear'");
    };

    return that;
  };

  Component.List = function (args) {
    var spec = args || {};
    var that = Component( spec );

    that.items = [];

    // NOTE: destructive
    that.$itemTemplate = (function () {
      var $template = that.find('item-template').$context;
      var $clone = $template.clone();

      $clone.removeClass( that.classNameFor('item-template') );
      $clone.addClass( that.classNameFor('item') );

      $template.remove();

      return $clone;
    }());

    that.buildItem = function (args) {
      throw new Error("call to abstract method 'buildItem'");
    };

    that.buildItemWithDefaults = function (args) {
      var withDefaults = {
        $context       : this.$itemTemplate.clone(),
        namespace      : this.classNameFor('item'),
        eventNamespace : this.eventNamespaceFor('item'),
        activeClass    : this.activeClass,
        disabledClass  : this.disabledClass,
        hideClass      : this.hideClass
      };

      for ( var key in args ) {
        if ( args.hasOwnProperty(key) ) {
          withDefaults[key] = args[key];
        }
      }

      return this.buildItem( withDefaults );
    };

    that.eachItem = function (callback) {
      foreach( this.items, callback );
    };

    that.clearItems = function () {
      this.eachItem(function (item) { item.$context.remove(); });
      this.items.length = 0;
    };

    that.addItem = function (item) {
      this.$context.append( item.$context );
      this.items.push( item );
    };

    return that;
  };

  Component.List.Item = function (args) {
    var spec = args || {};
    var that = Component( spec );

    return that;
  };

  MetaKGS.Component = Component;

}());

(function () {
  'use strict';

  var App = function (args) {
    var spec = args || {};
    var that = MetaKGS.Component( spec );

    that.call = function () {
      throw new Error("call to abstract method 'call'");
    };

    return that;
  };

  MetaKGS.App = App;

}());

(function () {
  'use strict';

  /* App runner */

  var keys    = MetaKGS.Util.keys;
  var foreach = MetaKGS.Util.foreach;

  $(document).ready(function () {
    foreach(keys(MetaKGS.App), function (name) {
      if ( name.match(/^[A-Z][a-zA-Z0-9]+$/) ) {
        $("[data-app='"+name+"']").each(function () {
          try {
            var $this = $(this);

            var app = MetaKGS.App[name].call(null, {
              $context: $this,
              namespace: $this.data('namespace'),
              eventNamespace: 'metakgs'+name
            });

            app.call();
          }
          catch (error) {
            console.log( "Failed to run '"+name+"': "+error );
          }
        });
      }
    });
  });

}());

(function () {
  'use strict';

  /*
   *  Navbar
   */

  MetaKGS.Component.Navbar = {
    path: "",
    $items: $(),
    activate: function() {
      var path = this.path;
      var $found;

      this.$items.each(function() {
        var $this = $( this );
        if ( $this.find("a").attr("href") === path ) {
          $found = $this;
          return false;
        }
      });

      if ( !$found ) { return; }

      this.$items.each(function() {
        $(this).removeClass("active");
      });

      $found.addClass( "active" );
    }
  };

}());

(function () {
  'use strict';

  var GitHub = {};

  GitHub.getRepository = function () {
    return $.getJSON( "https://api.github.com/repos/anazawa/metakgs.org" );
  };

  MetaKGS.GitHub = GitHub;

}());

(function() {
  "use strict";

  $(document).ready(function() {
    $("ul[data-toggle='navbar']").each(function() {
      var $this = $( this );
      var navbar = Object.create( MetaKGS.Component.Navbar );

      navbar.$items = $this.find( "li" );
      navbar.path   = $this.data( "path" ) || window.location.pathname;

      navbar.activate();
    });

    $(".js-github-issues-count").each(function() {
      var $this = $( this );

      $this.hide();
      MetaKGS.GitHub.getRepository().done(function(repository) {
        if ( repository.open_issues_count === 0 ) { return; }
        $this.text( repository.open_issues_count ).show();
      });
    });
  });

}());


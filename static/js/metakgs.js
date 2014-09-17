/*
 *  MetaKGS.js (https://github.com/anazawa/metakgs.org)
 *  Copyright 2014 Ryo Anazawa
 *  Licensed under MIT
 */

var MetaKGS = {
  App:       {},
  Component: {},
  Util:      {}
};

if ( typeof jQuery === "undefined" ) { throw "jquery.js is required"; }

if ( typeof window.console === "undefined" ) {
  window.console = {
    log:   function() {},
    warn:  function() {},
    error: function() {}
  };
}

(function(window, document, $, MetaKGS) {
  "use strict";

  /*
   *  Navbar
   */

  MetaKGS.Component.Navbar = {
    path: "",
    $items: $(),
    activate: function() {
      var path = this.path;
      this.$items.each(function() {
        var $this = $( this );
        if ( $this.find("a").attr("href") === path ) {
          $this.addClass( "active" );
          return false;
        }
      });
    }
  };

  /*
   *  Stopwatch object to calculate response times
   */

  MetaKGS.Util.Stopwatch = {
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

  /*
   *  Copied and rearranged from:
   *  https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_Expressions
   */

  MetaKGS.Util.escapeRegExp = function(string) {
    return string.replace( /([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1" );
  };

  $(document).ready(function() {
    $("ul[data-toggle='navbar']").each(function() {
      var $this = $( this );
      var navbar = Object.create( MetaKGS.Component.Navbar );

      navbar.$items = $this.find( "li" );
      navbar.path   = $this.data( "path" ) || window.location.pathname;

      navbar.activate();
    });
  });

}(window, document, jQuery, MetaKGS));

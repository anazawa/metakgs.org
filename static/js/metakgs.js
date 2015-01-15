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

  MetaKGS.GitHub = {
    getRepository: function() {
      return $.getJSON( "https://api.github.com/repos/anazawa/metakgs.org" );
    }
  };

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

  MetaKGS.Util.commify = function (string) {
    return string.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

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

}(window, document, jQuery, MetaKGS));

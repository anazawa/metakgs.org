if ( typeof MetaKGS === "undefined" ) { throw "metakgs.js is required"; }

(function(MetaKGS) {
  "use strict";

  //
  //  Utility objects
  //
    
  MetaKGS.Util = {};

  //
  //  Stopwatch object to calculate response times
  //

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

  //
  //  Copied and rearranged from:
  //  https://developer.mozilla.org/docs/Web/JavaScript/Guide/Regular_Expressions
  //

  MetaKGS.Util.escapeRegExp = function(string) {
    return string.replace( /([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1" );
  };

}(MetaKGS));

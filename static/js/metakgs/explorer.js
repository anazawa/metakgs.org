/*global window MetaKGS */
if ( typeof MetaKGS === "undefined" ) { throw "metakgs.js is required"; }
if ( typeof jQuery === "undefined" ) { throw "jQuery is required"; }

(function(document, $) {
  "use strict";

  //
  //  Constants
  //

  var CLICK    = "click";
  var DISABLED = "disabled";
  var HREF     = "href";

  //
  //  MeataKGS Explorer
  //

  MetaKGS.Explorer = {};

  MetaKGS.Explorer.create = function() {
    return Object.create( this.Prototype );
  };

  //
  //  Default values
  //

  MetaKGS.Explorer.Prototype = {
    eventNamespace:   "metakgsExplorer",
    $requestURL:      $(),
    $requestButton:   $(),
    $abortButton:     $(),
    $requestLinks:    $(),
    $showHeaders:     $(),
    $hideHeaders:     $(),
    $responseBody:    $(),
    $responseStatus:  $(),
    $responseHeaders: $(),
    $responseTime:    $(),
    $message:         $()
  };

  //
  //  The following requests are allowed:
  //
  //    * GET /api/archives/:user
  //    * GET /api/archives/:user/:year/:month
  //    * GET /api/top100
  //    * GET /api/tournaments
  //    * GET /api/tournaments/:year
  //    * GET /api/tournament/:id
  //    * GET /api/tournament/:id/entrants
  //    * GET /api/tournament/:id/round/:round
  //

  MetaKGS.Explorer.Prototype.baseURL = (function() {
    var loc = window.location;
    var path = loc.pathname.replace( /\/explorer$/, "" );
    return loc.protocol + "//" + loc.host + path;
  }());

  MetaKGS.Explorer.Prototype.buildURL = function(url) {
    if ( url.match(/^https?:\/\//) ) { return url; }
    return this.baseURL + "/" + url.replace( /^\//, "" );
  };

  MetaKGS.Explorer.Prototype.validPaths = new RegExp(
    "^\/api(?:"
      + [ "\/archives\/[a-zA-Z][a-zA-Z0-9]{0,9}(?:\/[1-9]\\d*\/(?:[1-9]|1[0-2]))?",
          "\/top100",
          "\/tournament\/[1-9]\\d*",
          "\/tournament\/[1-9]\\d*\/entrants",
          "\/tournament\/[1-9]\\d*\/round\/[1-9]\\d*",
          "\/tournaments(?:\/[1-9]\\d*)?" ].join("|")
      + ")$"
  );

  MetaKGS.Explorer.Prototype.isValidURL = function(url) {
    var baseURL = MetaKGS.Explorer.Util.escapeRegExp( this.baseURL );
    var path = this.buildURL( url ).replace( new RegExp("^"+baseURL), "" );
    return this.validPaths.test( path );
  };

  MetaKGS.Explorer.Prototype.eventNameFor = function(event) {
    return this.eventNamespace ? event + "." + this.eventNamespace : event;
  };

  MetaKGS.Explorer.Prototype.get = function(arg) {
    var url = this.buildURL( arg );
    var stopwatch = Object.create( MetaKGS.Explorer.Util.Stopwatch );

    this.start();

    if ( !arg ) {
      this.fail( "Request URL is required" );
      this.always();
      return;
    }
    else if ( !this.isValidURL(url) ) {
      this.fail( "Invalid request URL" );
      this.always();
      return;
    }

    $.ajax(url, {
      context: this,
      dataType: "json",
      beforeSend: function(jqXHR, settings) {
        this.send({
          url: settings.url,
          abort: function() { jqXHR.abort(); }
        });

        stopwatch.start();
      }
    }).
    fail(function(jqXHR, textStatus, errorThrown) {
      if ( jqXHR.status === 0 ) {
        if ( textStatus && textStatus === "timeout" ) {
          this.fail( "Request timed out" );
        }
        else if ( textStatus && textStatus === "abort" ) {
          this.fail( "Request aborted" );
        }
        else {
          this.fail( "Failed to GET " + url );
        }
      }
      else {
        this.done({
          code: jqXHR.status,
          message: jqXHR.statusText,
          body: jqXHR.responseJSON,
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field); },
            stringify: function() { return jqXHR.getAllResponseHeaders(); }
          },
          time: stopwatch.getElapsedTime()
        });
      }
    }).
    done(function(data, textStatus, jqXHR) {
      this.done({
        code: jqXHR.status,
        message: jqXHR.statusText,
        body: data,
        headers: {
          get: function(field) { return jqXHR.getResponseHeader(field); },
          stringify: function() { return jqXHR.getAllResponseHeaders(); }
        },
        time: stopwatch.getElapsedTime()
      });
    }).
    always(function() {
      this.always();
    });
  };

  MetaKGS.Explorer.Prototype.start = function() {
    this.$requestButton.prop( DISABLED, true );
    this.$responseStatus.empty().hide();
    this.$message.empty().hide();
    this.$showHeaders.hide();
    this.$hideHeaders.hide();
    this.$responseHeaders.empty().hide();
    this.$responseBody.empty().hide();
    this.$responseTime.empty().hide();
  };

  MetaKGS.Explorer.Prototype.send = function(request) { 
    var click = this.eventNameFor( CLICK );

    this.$abortButton.one(click, function(event) {
      request.abort();
      event.preventDefault();
    });

    this.$requestURL.val( request.url );
    this.$abortButton.prop( DISABLED, false );
    this.$message.text( "Loading..." ).show();
  };

  MetaKGS.Explorer.Prototype.done = function(response) {
    var that = this;
    var click = this.eventNameFor( CLICK );

    this.$message.hide();

    this.$responseStatus.text( response.code + " " + response.message ).show();
    this.$responseHeaders.text( response.headers.stringify() );
    this.$responseBody.JSONView( response.body ).show();
    this.$responseTime.text( response.time/1000 + " seconds" ).show();
    this.$showHeaders.show();

    this.$responseBody.find("a").each(function() {
      var $this = $( this );
      var url = $this.attr( HREF );

      if ( that.isValidURL(url) ) {
        $this.on(click, function(event) {
          that.$requestURL.val( $(this).attr(HREF) );
          that.$requestButton.click();
          event.preventDefault();
        });
      }
      else {
        $this.attr( "target", "_blank" );
      }
    });
  };

  MetaKGS.Explorer.Prototype.fail = function(message) {
    this.$message.text( message ).show();
  };

  MetaKGS.Explorer.Prototype.always = function() {
    var click = this.eventNameFor( CLICK );
    this.$abortButton.off( click ).prop( DISABLED, true );
    this.$requestButton.prop( DISABLED, false );
  };
  
  MetaKGS.Explorer.Prototype.registerEvents = function() {
    var that = this;
    var click = this.eventNameFor( CLICK );

    this.$requestButton.prop( DISABLED, false );
    this.$abortButton.prop( DISABLED, true );

    this.$showHeaders.hide();
    this.$hideHeaders.hide();
    this.$responseStatus.hide();
    this.$responseHeaders.hide();
    this.$responseBody.hide();

    this.$message.hide();

    this.$requestButton.on(click, function(event) {
      that.get( that.$requestURL.val() );
      event.preventDefault();
    });

    this.$showHeaders.on(click, function(event) {
      $( this ).hide();
      that.$hideHeaders.show();
      that.$responseHeaders.show();
      event.preventDefault();
    });

    this.$hideHeaders.on(click, function(event) {
      $( this ).hide();
      that.$showHeaders.show();
      that.$responseHeaders.hide();
      event.preventDefault();
    });

    this.$requestLinks.on(click, function(event) {
      that.$requestURL.val( $(this).attr(HREF) );
      that.$requestButton.click();
      event.preventDefault();
    });
  };

  //
  //  Utility objects
  //
    
  MetaKGS.Explorer.Util = {};

  //
  //  Stopwatch object to calculate response times
  //

  MetaKGS.Explorer.Util.Stopwatch = {
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

  MetaKGS.Explorer.Util.escapeRegExp = function(string) {
    return string.replace( /([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1" );
  };

  //
  //  Activate MetaKGS Explorer
  //

  $(document).ready(function() {
    var explorer = MetaKGS.Explorer.create();
    var $requestForm = $( "#js-request-form" );

    //
    //  Request
    //

    explorer.$requestURL    = $requestForm.find( "input[name='url']" );
    explorer.$requestButton = $requestForm.find( "input[type='submit']" );
    explorer.$abortButton   = $requestForm.find( "input[type='reset']" );
    explorer.$requestLinks  = $( ".js-request-link" );

    //
    //  Response
    //

    explorer.$responseStatus  = $( "#js-response-status" );
    explorer.$responseHeaders = $( "#js-response-headers" );
    explorer.$showHeaders     = $( "#js-show-headers" );
    explorer.$hideHeaders     = $( "#js-hide-headers" );
    explorer.$responseBody    = $( "#js-response-body" );
    explorer.$responseTime    = $( "#js-response-time" );

    //
    //  Error, progress, etc.
    //

    explorer.$message = $( "#js-message" );

    explorer.registerEvents();
  });
}(document, jQuery));


/*global window MetaKGS hljs Location */
if ( typeof MetaKGS === "undefined" ) { throw "metakgs.js is required"; }
if ( typeof jQuery === "undefined" ) { throw "jQuery is required"; }
if ( typeof Location.parse === "undefined" ) { throw "micro-location.js is required"; }
if ( typeof hljs === "undefined" ) { throw "highlight.js is required"; }

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
    var that = Object.create( this.Prototype );
    that.progressIndicator = Object.create( this.ProgressIndicator );
    that.history = [];
    return that;
  };

  //
  //  Default values
  //

  MetaKGS.Explorer.Prototype = {
    eventNamespace:   "",
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
    $message:         $(),
    maxHistoryLength: 0,
    history:          [],
    $history:         $(),
    $showAllHistory:  $(),
    $showSomeHistory: $()
  };

  MetaKGS.Explorer.Prototype.progressIndicator = {
    start: function(args) {},
    stop: function() {}
  };

  //
  //  The following requests are allowed:
  //
  //  * GET /api/archives/:user
  //  * GET /api/archives/:user/:year/:month
  //  * GET /api/top100
  //  * GET /api/tournaments
  //  * GET /api/tournaments/:year
  //  * GET /api/tournament/:id
  //  * GET /api/tournament/:id/entrants
  //  * GET /api/tournament/:id/round/:round
  //

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

  MetaKGS.Explorer.Prototype.eventNameFor = function(event) {
    return this.eventNamespace ? event + "." + this.eventNamespace : event;
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
    var that = this;
    var click = this.eventNameFor( CLICK );

    this.history.push({
      url: request.url,
      method: request.method,
      date: request.date
    });

    this.$abortButton.
      one(click, function(event) {
        request.abort();
        event.preventDefault(); }).
      prop( DISABLED, false );

    this.$message.show();
    this.progressIndicator.start({
      writer: { write: function(msg) { that.$message.text(msg); } },
      delay: 500
    });
  };

  MetaKGS.Explorer.Prototype.done = function(response) {
    var that = this;
    var click = this.eventNameFor( CLICK );
    var status = response.code + " " + response.message;
    var headers = response.headers.stringify();
    var body = response.body && JSON.stringify( response.body, null, 4 );
    var time = response.time/1000 + " seconds";

    this.progressIndicator.stop();
    this.$message.hide();

    this.$responseStatus.text( status ).show();
    this.$showHeaders.show();
    this.$responseHeaders.text( headers );
    this.$responseTime.text( time ).show();

    this.updateHistory();

    if ( !body ) { return; }

    // highlight JSON
    this.$responseBody.empty().append( $("<div></div>").text(body) ).show();
    hljs.highlightBlock( this.$responseBody.find("div")[0] );

    //
    //  Find URLs in $responseBody and hyperlink them
    //

    this.$responseBody.find(".hljs-string").each(function() {
      var $this = $( this ), $a;
      var isURL = /^\"(http:\/\/.*)\"$/.exec( $this.html() || "" );
      var url = isURL && Location.parse( isURL[1] ); // HTML-escaped

      if ( !isURL ) { return; }

      $a = $( "<a></a>" ).attr( HREF, url.href ).html( url.href );
      $this.empty().append( "\"", $a, "\"" );

      if ( url.host !== window.location.host ) { return; }
      if ( !that.validPaths.test(url.pathname) ) { return; }

      $a.on(click, function(event) {
        that.$requestURL.val( url.pathname );
        that.$requestButton.click();
        event.preventDefault();
      });
    });
  };

  MetaKGS.Explorer.Prototype.fail = function(message) {
    this.progressIndicator.stop();
    this.$message.text( message ).show();
  };

  MetaKGS.Explorer.Prototype.always = function() {
    var click = this.eventNameFor( CLICK );
    this.$abortButton.prop( DISABLED, true ).off( click );
    this.$requestButton.prop( DISABLED, false );
    this.updateLocationHash();
  };
  
  MetaKGS.Explorer.Prototype.updateLocationHash = function() {
  };

  MetaKGS.Explorer.Prototype.updateHistory = function(args) {
    var that = this;
    var click = this.eventNameFor( CLICK );
    var showAll = args && args.showAll;

    var urls = [];
    (function() {
      var i, url, seen = {};
      var history = that.history;

      for ( i = history.length - 1; i >= 0; i-- ) {
        url = history[i].url;
        if ( !seen[url] ) {
          urls.push( url );
          seen[url] = true;
        }
      }
    }());

    if ( urls.length ) {
      this.$history.empty().show();
    }
    else {
      this.$history.hide();
    }

    (function() {
      var i, url, $a;
      var max = showAll ? urls.length : that.maxHistoryLength;

      var handler = function(event) {
        that.$requestURL.val( $(this).attr(HREF) );
        that.$requestButton.click();
        event.preventDefault();
      };

      for ( i = 0; i < urls.length && max > 0; i++, max-- ) {
        $a = $( "<a></a>" ).attr( HREF, urls[i] ).text( "GET " + urls[i] );
        $a.on( click, handler );
        that.$history.append( $a );
        $a.wrap( "<li></li>" );
      }
    }());

    if ( urls.length > this.maxHistoryLength ) {
      if ( showAll ) {
        this.$showAllHistory.hide();
        this.$showSomeHistory.show();
      }
      else {
        this.$showAllHistory.show();
        this.$showSomeHistory.hide();
      }
    }
    else {
      this.$showAllHistory.hide();
      this.$showSomeHistory.hide();
    }
  };

  MetaKGS.Explorer.Prototype.get = function(path) {
    var stopwatch = Object.create( MetaKGS.Explorer.Util.Stopwatch );

    this.start();

    if ( !path ) {
      this.fail( "Request URL is required" );
      this.always();
      return;
    }
    else if ( !this.validPaths.test(path) ) {
      this.fail( "Invalid request URL" );
      this.always();
      return;
    }

    $.ajax(path, {
      context: this,
      dataType: "json", // XXX
      beforeSend: function(jqXHR, settings) {
        this.send({
          method: "GET",
          url: settings.url,
          date: new Date(),
          abort: function() { jqXHR.abort(); }
        });

        stopwatch.start();
      }
    }).
    fail(function(jqXHR, textStatus, errorThrown) {
      if ( jqXHR.status === 0 ) { // XXX
        this.fail( "GET " + path + " failed: " + textStatus );
        return;
      }

      this.done({
        code: jqXHR.status,
        message: jqXHR.statusText,
        body: jqXHR.responseJSON,
        time: stopwatch.getElapsedTime(),
        headers: {
          get: function(field) { return jqXHR.getResponseHeader(field); },
          stringify: function() { return jqXHR.getAllResponseHeaders(); }
        }
      });
    }).
    done(function(data, textStatus, jqXHR) {
      this.done({
        code: jqXHR.status,
        message: jqXHR.statusText,
        body: data, // XXX
        time: stopwatch.getElapsedTime(),
        headers: {
          get: function(field) { return jqXHR.getResponseHeader(field); },
          stringify: function() { return jqXHR.getAllResponseHeaders(); }
        }
      });
    }).
    always(function() {
      this.always();
    });
  };

  MetaKGS.Explorer.Prototype.registerEvents = function() {
    var that = this;
    var click = this.eventNameFor( CLICK );

    this.$requestButton.prop( DISABLED, false );
    this.$abortButton.prop( DISABLED, true );

    this.$message.hide();

    this.$showHeaders.hide();
    this.$hideHeaders.hide();
    this.$responseStatus.hide();
    this.$responseHeaders.hide();
    this.$responseBody.hide();

    this.$history.hide();
    this.$showAllHistory.hide();
    this.$showSomeHistory.hide();

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

    this.$showSomeHistory.on(click, function(event) {
      that.updateHistory();
      event.preventDefault();
    });

    this.$showAllHistory.on(click, function(event) {
      that.updateHistory({ showAll: true });
      event.preventDefault();
    });
  };

  //
  //  Simple progress indicator
  //

  MetaKGS.Explorer.ProgressIndicator = {
    index: 0,
    intervalID: null,
    messages: [],
    nextMessage: function() {
      var index = this.index;
      this.index = index === this.messages.length - 1 ? 0 : index + 1;
      return this.messages[ index ];
    },
    start: function(args) {
      var that = this;
      var writer = args.writer || { write: function(message) {} };

      this.index = 0;
      writer.write( this.nextMessage() );

      this.intervalID = window.setInterval(
        function() { writer.write(that.nextMessage()); },
        args.delay
      );
    },
    stop: function() {
      if ( this.intervalID !== null ) {
        window.clearInterval( this.intervalID );
        this.intervalID = null;
      }
    }
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
  //  Activate MetaKGS Explorer
  //

  $(document).ready(function() {
    var explorer = MetaKGS.Explorer.create();
    var $history = $( "#js-history" );
    var $requestForm = $( "#js-request-form" );

    explorer.eventNamespace = "metakgsExplorer";

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

    //
    //  History
    // 

    explorer.maxHistoryLength = $history.data("max-length") || 10;
    explorer.$history         = $history;
    explorer.$showAllHistory  = $(" #js-show-all-history" );
    explorer.$showSomeHistory = $(" #js-show-some-history" );

    explorer.updateLocationHash = function() {
      window.location.hash = "response";
    };

    explorer.progressIndicator.messages = [
      "Requesting",
      "Requesting.",
      "Requesting..",
      "Requesting..."
    ];

    explorer.registerEvents();
  });
}(document, jQuery));


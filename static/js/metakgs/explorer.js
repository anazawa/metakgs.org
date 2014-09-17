if ( typeof MetaKGS === "undefined" ) { throw "metakgs.js is required"; }
if ( typeof jQuery === "undefined" ) { throw "jquery.js is required"; }
if ( typeof jQuery.fn.JSONView === "undefined" ) { throw "jquery.jsonview.js is required"; }

(function(window, $, MetaKGS) {
  "use strict";

  /*
   *  MeataKGS Explorer
   */

  MetaKGS.App.Explorer = {
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

  MetaKGS.App.Explorer.eventNameFor = function(event) {
    return this.eventNamespace ? event + "." + this.eventNamespace : event;
  };

  MetaKGS.App.Explorer.baseURL = (function() {
    var loc = window.location;
    var path = loc.pathname.replace( /\/explorer$/, "" );
    return loc.protocol + "//" + loc.host + path;
  }());

  MetaKGS.App.Explorer.buildURL = function(url) {
    if ( url.match(/^https?:\/\//) ) { return url; }
    return this.baseURL + "/" + url.replace( /^\//, "" );
  };

  /*
   *  The following requests are allowed:
   * 
   *    - GET /api/archives/:user
   *    - GET /api/archives/:user/:year/:month
   *    - GET /api/top100
   *    - GET /api/tournaments
   *    - GET /api/tournaments/:year
   *    - GET /api/tournament/:id
   *    - GET /api/tournament/:id/entrants
   *    - GET /api/tournament/:id/round/:round
   */

  MetaKGS.App.Explorer.validPaths = new RegExp(
    "^\/api(?:" + [
      "\/archives\/[a-zA-Z][a-zA-Z0-9]{0,9}(?:\/[1-9]\\d*\/(?:[1-9]|1[0-2]))?",
      "\/top100",
      "\/tournament\/[1-9]\\d*",
      "\/tournament\/[1-9]\\d*\/entrants",
      "\/tournament\/[1-9]\\d*\/round\/[1-9]\\d*",
      "\/tournaments(?:\/[1-9]\\d*)?"
    ].join("|") + ")$"
  );

  MetaKGS.App.Explorer.isValidURL = function(url) {
    var baseURL = MetaKGS.Util.escapeRegExp( this.baseURL );
    var path = this.buildURL( url ).replace( new RegExp("^"+baseURL), "" );
    return this.validPaths.test( path );
  };

  MetaKGS.App.Explorer.get = function(arg) {
    var url = this.buildURL( arg );
    var stopwatch = Object.create( MetaKGS.Util.Stopwatch );

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
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field); },
            stringify: function() { return jqXHR.getAllResponseHeaders(); }
          },
          body: jqXHR.responseJSON,
          time: stopwatch.getElapsedTime()
        });
      }
    }).
    done(function(data, textStatus, jqXHR) {
      this.done({
        code: jqXHR.status,
        message: jqXHR.statusText,
        headers: {
          get: function(field) { return jqXHR.getResponseHeader(field); },
          stringify: function() { return jqXHR.getAllResponseHeaders(); }
        },
        body: data,
        time: stopwatch.getElapsedTime()
      });
    }).
    always(function() {
      this.always();
    });
  };

  MetaKGS.App.Explorer.start = function() {
    this.$requestButton.prop( "disabled", true );
    this.$responseStatus.empty().hide();
    this.$message.empty().hide();
    this.$showHeaders.hide();
    this.$hideHeaders.hide();
    this.$responseHeaders.empty().hide();
    this.$responseBody.empty().hide();
    this.$responseTime.empty().hide();
  };

  MetaKGS.App.Explorer.send = function(request) { 
    var click = this.eventNameFor( "click" );

    this.$abortButton.one(click, function(event) {
      request.abort();
      event.preventDefault();
    });

    this.$requestURL.val( request.url );
    this.$abortButton.prop( "disabled", false );
    this.$message.text( "Loading..." ).show();
  };

  MetaKGS.App.Explorer.done = function(response) {
    var that = this;
    var click = this.eventNameFor( "click" );

    this.$message.hide();

    this.$responseStatus.text( response.code + " " + response.message ).show();
    this.$responseHeaders.text( response.headers.stringify() );
    this.$responseBody.JSONView( response.body ).show();
    this.$responseTime.text( response.time/1000 + " seconds" ).show();
    this.$showHeaders.show();

    this.$responseBody.find("a").each(function() {
      var $this = $( this );
      var url = $this.attr( "href" );

      if ( !that.isValidURL(url) ) { return; }

      $this.on(click, function(event) {
        that.$requestURL.val( $(this).attr("href") );
        that.$requestButton.click();
        event.preventDefault();
      });
    });
  };

  MetaKGS.App.Explorer.fail = function(message) {
    this.$message.text( message ).show();
  };

  MetaKGS.App.Explorer.always = function() {
    var click = this.eventNameFor( "click" );
    this.$abortButton.off( click ).prop( "disabled", true );
    this.$requestButton.prop( "disabled", false );
  };
  
  MetaKGS.App.Explorer.run = function() {
    var that = this;
    var click = this.eventNameFor( "click" );

    this.$requestButton.prop( "disabled", false );
    this.$abortButton.prop( "disabled", true );

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
      that.$requestURL.val( $(this).attr("href") );
      that.$requestButton.click();
      event.preventDefault();
    });
  };

  $(document).ready(function() {
    var explorer = Object.create( MetaKGS.App.Explorer );
    var $requestForm = $( "#js-request-form" );

    /*
     *  Request
     */

    explorer.$requestURL    = $requestForm.find( "input[name='url']" );
    explorer.$requestButton = $requestForm.find( "input[type='submit']" );
    explorer.$abortButton   = $requestForm.find( "input[type='reset']" );
    explorer.$requestLinks  = $( ".js-request-link" );

    /*
     *  Response
     */

    explorer.$responseStatus  = $( "#js-response-status" );
    explorer.$responseHeaders = $( "#js-response-headers" );
    explorer.$showHeaders     = $( "#js-show-headers" );
    explorer.$hideHeaders     = $( "#js-hide-headers" );
    explorer.$responseBody    = $( "#js-response-body" );
    explorer.$responseTime    = $( "#js-response-time" );

    /*
     *  Error, progress, etc.
     */

    explorer.$message = $( "#js-message" );

    explorer.run();
  });
 
}(window, jQuery, MetaKGS));


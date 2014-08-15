(function (document, $) {
  $(function () {
    "use strict";

    var MetaKGS = {};

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
    //  jQuery.ajax() wrapper
    //

    MetaKGS.UserAgent = {
        start: function() {},
         send: function(request) {},
      success: function(response) {},
        error: function(message) {},
         stop: function() {}
    };

    MetaKGS.UserAgent.get = function(url) {
      var stopwatch = Object.create( MetaKGS.Util.Stopwatch );

      this.start();

      $.ajax(url, {
        context: this,
        dataType: "json", // XXX
        beforeSend: function(jqXHR, settings) {
          this.send({
            url: settings.url,
            abort: function() { jqXHR.abort() }
          });

          stopwatch.start();
        }
      }).
      fail(function(jqXHR, textStatus, errorThrown) {
        if ( jqXHR.status === 0 ) { // XXX
          this.error( "GET " + url + " failed: " + textStatus );
          return;
        }

        this.success({
          code: jqXHR.status,
          message: jqXHR.statusText,
          body: jqXHR.responseJSON,
          time: stopwatch.getElapsedTime(),
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field) },
            stringify: function() { return jqXHR.getAllResponseHeaders() }
          }
        });
      }).
      done(function(data, textStatus, jqXHR) {
        this.success({
          code: jqXHR.status,
          message: jqXHR.statusText,
          body: data, // XXX
          time: stopwatch.getElapsedTime(),
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field) },
            stringify: function() { return jqXHR.getAllResponseHeaders() }
          }
        });
      }).
      always(function() {
        this.stop();
      });
    };

    //
    //  MeataKGS Explorer
    //

    MetaKGS.Explorer = {};

    MetaKGS.Explorer.create = function(args) {
      var explorer = Object.create( this.UserAgent );

      explorer.$requestURL    = args.$requestURL    || $();
      explorer.$requestButton = args.$requestButton || $();
      explorer.$abortButton   = args.$abortButton   || $();

      explorer.$responseBody    = args.$responseBody    || $();
      explorer.$responseStatus  = args.$responseStatus  || $();
      explorer.$responseHeaders = args.$responseHeaders || $();
      explorer.$responseTime    = args.$responseTime    || $();

      explorer.progressIndicator = Object.create( this.ProgressIndicator );

      return explorer;
    };

    //
    //  MeataKGS Explorer main object
    //

    MetaKGS.Explorer.UserAgent = Object.create( MetaKGS.UserAgent );

    MetaKGS.Explorer.UserAgent.$requestURL    = $();
    MetaKGS.Explorer.UserAgent.$requestButton = $();
    MetaKGS.Explorer.UserAgent.$abortButton   = $();

    MetaKGS.Explorer.UserAgent.$responseBody    = $();
    MetaKGS.Explorer.UserAgent.$responseStatus  = $();
    MetaKGS.Explorer.UserAgent.$responseHeaders = $();
    MetaKGS.Explorer.UserAgent.$responseTime    = $();

    MetaKGS.Explorer.UserAgent.progressIndicator = {
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

    MetaKGS.Explorer.UserAgent.validPaths = new RegExp(
      "^\/api(?:"
        + [ "\/archives\/[a-zA-Z][a-zA-Z0-9]{0,9}(?:\/[1-9]\\d*\/(?:[1-9]|1[0-2]))?",
            "\/top100",
            "\/tournament\/[1-9]\\d*",
            "\/tournament\/[1-9]\\d*\/entrants",
            "\/tournament\/[1-9]\\d*\/round\/[1-9]\\d*",
            "\/tournaments(?:\/[1-9]\\d*)?" ].join("|")
        + ")$"
    );

    MetaKGS.Explorer.UserAgent.start = function() {
      this.$requestButton.prop( "disabled", true );
      this.$responseStatus.text( "" );
      this.$responseHeaders.text( "" );
      this.$responseBody.text( "" );
      this.$responseTime.text( "" );
    };

    MetaKGS.Explorer.UserAgent.send = function(request) { 
      var that = this;

      this.$abortButton.
        one("click.metakgsExplorer", function(event) {
          request.abort();
          event.preventDefault(); }).
        prop( "disabled", false );

      this.progressIndicator.start({
        writer: { write: function(msg) { that.$responseBody.text(msg) } },
        delay: 500
      });
    };

    MetaKGS.Explorer.UserAgent.success = function(response) {
      var that = this;
      var status = response.code + " " + response.message;
      var headers = response.headers.stringify() + "\n";
      var body = response.body ? JSON.stringify(response.body, null, 4) : "";
      var time = response.time/1000 + " seconds";

      this.progressIndicator.stop();

      this.$responseStatus.text( status );
      this.$responseHeaders.text( headers );
      this.$responseBody.text( body );
      this.$responseTime.text( time );

      hljs.highlightBlock( this.$responseBody[0] );

      //
      //  Find URLs in $responseBody and hyperlink them
      //

      this.$responseBody.find(".hljs-string").each(function() {
        var $this = $( this );
        var isURL = /^\"(http:\/\/.*)\"$/.exec( $this.html() || "" );

        var $a = isURL && $( "<a></a>" );
        var url = isURL && Location.parse( isURL[1] );
        var host = isURL && Location.parse( window.location ).host;

        if ( !isURL ) {
          return;
        }

        $a.attr( "href", url.href ).html( url.href );
        $this.html( "\"" ).append( $a ).append( "\"" );

        if ( url.host === host && that.validPaths.test(url.pathname) ) {
          $a.on("click.metakgsExplorer", function(event) {
            that.$requestURL.val( url.pathname );
            that.$requestButton.click();
            event.preventDefault();
          });
        }
      });
    };

    MetaKGS.Explorer.UserAgent.error = function(message) {
      this.progressIndicator.stop();
      this.$responseBody.text( message );
    };

    MetaKGS.Explorer.UserAgent.stop = function() {
      this.$abortButton.
        off( "click.metakgsExplorer" ).
        prop( "disabled", true );

      this.$requestButton.prop( "disabled", false );

      window.location.hash = "request";
    };

    MetaKGS.Explorer.UserAgent.run = function() {
      var path = this.$requestURL.val();

      try {
        if ( !path ) {
          throw "Request URL is required";
        }
        else if ( !this.validPaths.test(path) ) {
          throw "Invalid request URL";
        }
      }
      catch ( message ) {
        this.start();
        this.error( message );
        this.stop();
        return;
      }

      this.get( path );
    };

    //
    //  Simple progress indicator
    //

    MetaKGS.Explorer.ProgressIndicator = {
      index: 0,
      intervalID: null,
      messages: [
        "Requesting",
        "Requesting.",
        "Requesting..",
        "Requesting..."
      ],
      nextMessage: function() {
        var index = this.index;
        this.index = index === this.messages.length - 1 ? 0 : index + 1;
        return this.messages[ index ];
      },
      start: function(args) {
        var that = this;
        var writer = args.writer || { write: function(message) {} };

        writer.write( this.nextMessage() );

        this.intervalID = setInterval(
          function() { writer.write(that.nextMessage()) },
          args.delay
        );
      },
      stop: function() {
        if ( this.intervalID !== null ) {
          clearInterval( this.intervalID );
          this.intervalID = null;
        }
      }
    };

    $("#js-request-form").on("submit.metakgsExplorer", function(event) {
      var $this = $( this );

      var explorer = MetaKGS.Explorer.create({
        $requestURL:      $this.find( "input[name='url']" ),
        $requestButton:   $this.find( "input[type='submit']" ),
        $abortButton:     $this.find( "input[type='reset']" ),
        $responseStatus:  $( "#js-response-status" ),
        $responseHeaders: $( "#js-response-headers" ),
        $responseBody:    $( "#js-response-body" ),
        $responseTime:    $( "#js-response-time" )
      });

      explorer.run();

      event.preventDefault();
    });
  });
})(document, jQuery);


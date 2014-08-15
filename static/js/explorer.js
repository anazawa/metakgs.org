(function (document, $) {
  $(function () {
    "use strict";

    var MetaKGS = {};

    //
    //  Stopwatch object to calculate response times
    //

    MetaKGS.Stopwatch = {
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
    //  MeataKGS Explorer base object
    //
    //  * allow users to browse MetaKGS APIs
    //

    MetaKGS.Explorer = {};

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

    MetaKGS.Explorer.validPaths = new RegExp(
      "^\/api(?:"
        + [ "\/archives\/[a-zA-Z][a-zA-Z0-9]{0,9}(?:\/[1-9]\\d*\/(?:[1-9]|1[0-2]))?",
            "\/top100",
            "\/tournament\/[1-9]\\d*",
            "\/tournament\/[1-9]\\d*\/entrants",
            "\/tournament\/[1-9]\\d*\/round\/[1-9]\\d*",
            "\/tournaments(?:\/[1-9]\\d*)?" ].join("|")
        + ")$"
    );

    //
    //  * wrap jQuery.ajax()
    //  * calculate response times using MetaKGS.Stopwatch
    //

    MetaKGS.Explorer.get = function(path, args) {
      var that = this;

      var handlers = {
          start: args.start   || function() {},
           send: args.send    || function(request) {},
        success: args.success || function(response) {},
          error: args.error   || function(message) {},
           stop: args.stop    || function() {}
      };

      var context = {
        start: function() { handlers.start.apply(that) },
        send: function(req) { handlers.send.apply(that, [req]) },
        success: function(res) { handlers.success.apply(that, [res]) },
        error: function(msg) { handlers.error.apply(that, [msg]) },
        stop: function() { handlers.stop.apply(that) },
        stopwatch: Object.create( MetaKGS.Stopwatch )
      };

      context.start();

      if ( !path ) {
        context.error( "Request URL is required" );
        context.stop();
        return;
      }
      else if ( !this.validPaths.test(path) ) {
        context.error( "Invalid request URL" );
        context.stop();
        return;
      }

      $.ajax(path, {
        context: context,
        dataType: "json", // XXX
        beforeSend: function(jqXHR, settings) {
          this.send({
            abort: function() { jqXHR.abort() }
          });

          this.stopwatch.start();
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
          time: this.stopwatch.getElapsedTime(),
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
          time: this.stopwatch.getElapsedTime(),
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
    //  * register events
    //  * define when/how to update HTML document
    //

    $("#js-request-form").on("submit.metakgsExplorer", function(event) {
      var $this = $( this );
      var explorer = Object.create( MetaKGS.Explorer );

      explorer.$requestURL = $this.find( "input[name='url']" );
      explorer.$requestButton = $this.find( "input[type='submit']" );
      explorer.$abortButton = $this.find( "input[type='reset']" );

      explorer.$responseStatus = $( "#js-response-status" );
      explorer.$responseHeaders = $( "#js-response-headers" );
      explorer.$responseBody = $( "#js-response-body" );
      explorer.$responseTime = $( "#js-response-time" );

      //
      //  Simple progress indicator
      //

      explorer.progressIndicator = {
        index: 0,
        intervalID: null,
        messages: [
          "Requesting",
          "Requesting.",
          "Requesting..",
          "Requesting..."
        ],
        nextMessage: function() {
          var i = this.index;
          var message = this.messages[ i ];
          this.index = i === this.messages.length - 1 ? 0 : i + 1;
          return message;
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

      explorer.get($this.find("input[name='url']").val(), {
        start: function() {
          this.$requestButton.prop( "disabled", true );
          this.$responseStatus.text( "" );
          this.$responseHeaders.text( "" );
          this.$responseBody.text( "" );
          this.$responseTime.text( "" );
        },
        send: function(request) { 
          var that = this;

          this.$abortButton.
            one("click.metakgsExplorer", function(e) {
              request.abort();
              e.preventDefault(); }).
            prop( "disabled", false );

          this.progressIndicator.start({
            writer: { write: function(msg) { that.$responseBody.text(msg) } },
            delay: 500
          });
        },
        success: function(response) {
          var that = this;
          var status = response.code + " " + response.message;
          var headers = response.headers.stringify() + "\n";
          var body = response.body && JSON.stringify( response.body, null, 4 );
          var time = response.time/1000 + " seconds";

          this.progressIndicator.stop();

          this.$responseStatus.text( status );
          this.$responseHeaders.text( headers );
          this.$responseBody.text( body || "" );
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
              $a.on("click.metakgsExplorer", function(e) {
                that.$requestURL.val( url.pathname );
                that.$requestButton.click();
                e.preventDefault();
              });
            }
          });
        },
        error: function(message) {
          this.progressIndicator.stop();
          this.$responseBody.text( message );
        },
        stop: function() {
          this.$abortButton.
            off( "click.metakgsExplorer" ).
            prop( "disabled", true );

          this.$requestButton.prop( "disabled", false );

          window.location.hash = "request";
        }
      });

      event.preventDefault();
    });
  });
})(document, jQuery);


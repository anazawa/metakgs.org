(function (document, $) {
  $(function () {
    "use strict";

    var MetaKGS = {};

    //
    //  Simple stopwatch object to calculate response times
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
    //  * define valid URLs
    //  * wrap jQuery.ajax()
    //  * calculate response times using Stopwatch
    //

    MetaKGS.Explorer = {};

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

    MetaKGS.Explorer.get = function(path, args) {
      var stopwatch = Object.create( MetaKGS.Stopwatch );

      var handlers = {
          start: args.start   || function() {},
           send: args.send    || function(request) {},
        success: args.success || function(response) {},
          error: args.error   || function(message) {},
           stop: args.stop    || function() {}
      };

      handlers.start.apply( this );

      if ( !path ) {
        handlers.error.apply( this, ["Request URL is required"] );
        handlers.stop.apply( this );
        return;
      }
      else if ( !this.validPaths.test(path) ) {
        handlers.error.apply( this, ["Invalid request URL"] );
        handlers.stop.apply( this );
        return;
      }

      $.ajax(path, {
        context: this,
        dataType: "json", // XXX
        beforeSend: function(jqXHR, settings) {
          handlers.send.apply(this, [{
            abort: function() { jqXHR.abort() }
          }]);

          stopwatch.start();
        }
      }).
      fail(function(jqXHR, textStatus, errorThrown) {
        if ( jqXHR.status === 0 ) { // XXX
          handlers.error.apply( this, ["GET "+url+" failed: "+textStatus] );
          return;
        }

        handlers.success.apply(this, [{
          code: jqXHR.status,
          message: jqXHR.statusText,
          body: jqXHR.responseJSON,
          time: stopwatch.getElapsedTime(),
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field) },
            stringify: function() { return jqXHR.getAllResponseHeaders() }
          }
        }]);
      }).
      done(function(data, textStatus, jqXHR) {
        handlers.success.apply(this, [{
          code: jqXHR.status,
          message: jqXHR.statusText,
          body: data, // XXX
          time: stopwatch.getElapsedTime(),
          headers: {
            get: function(field) { return jqXHR.getResponseHeader(field) },
            stringify: function() { return jqXHR.getAllResponseHeaders() }
          }
        }]);
      }).
      always(function() {
        handlers.stop.apply( this );
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

      explorer.showProgress = {
        index: 0,
        intervalId: null,
        messages: [
          "Requesting",
          "Requesting.",
          "Requesting..",
          "Requesting..."
        ],
        nextMessage: function() {
          var message = this.messages[ this.index ];

          if ( this.index === this.messages.length - 1 ) {
            this.index = 0;
          }
          else {
            this.index++;
          }

          return message;
        },
        start: function(args) {
          var that = this;
          var writer = args.writer;
          writer.write( this.nextMessage() );
          this.intervalId = setInterval(function() {
            writer.write( that.nextMessage() );
          }, args.delay);
        },
        stop: function() {
          if ( this.intervalId !== null ) {
            clearInterval( this.intervalId );
            this.intervalId = null;
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

          this.showProgress.start({
            writer: {
              write: function(value) { that.$responseBody.text(value) },
            },
            delay: 500
          });
        },
        success: function(response) {
          var that = this;
          var status = response.code + " " + response.message;
          var headers = response.headers.stringify() + "\n";
          var body = response.body && JSON.stringify( response.body, null, 4 );
          var time = response.time/1000 + " seconds";

          this.showProgress.stop();

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

            if ( isURL ) {
              $a.attr( "href", url.href ).html( url.href );
            }
            else {
              return;
            }

            if ( url.host === host && that.validPaths.test(url.pathname) ) {
              $a.on("click.metakgsExplorer", function(e) {
                that.$requestURL.val( url.pathname );
                that.$requestButton.click();
                e.preventDefault();
              });
            }

            $this.html( "\"" ).append( $a ).append( "\"" );
          });
        },
        error: function(message) {
          this.showProgress.stop();
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


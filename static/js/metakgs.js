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

  var error = function (args) {
    var spec = args || {};

    var that = {
      name    : spec.name    || 'MetaKGSError',
      message : spec.message || '',
      stack   : spec.stack
    };

    that.toString = function () {
      return this.message ? this.name+': '+this.message : this.name;
    };

    return that;
  };

  MetaKGS.error = function (message) {
    return error({
      message : message,
      stack   : (new Error()).stack
    });
  };

  MetaKGS.argumentError = function (message) {
    return error({
      name    : 'MetaKGSArgumentError',
      message : message,
      stack   : (new Error()).stack
    });
  };

  MetaKGS.notImplementedError = function (message) {
    return error({
      name    : 'MetaKGSNotImplementedError',
      message : message,
      stack   : (new Error()).stack
    });
  };

  MetaKGS.timeoutError = function (message) {
    return error({
      name    : 'MetaKGSTimeoutError',
      message : message,
      stack   : (new Error()).stack
    });
  };

  MetaKGS.connectionFailed = function (message) {
    return error({
      name    : 'MetaKGSConnectionFailed',
      message : message,
      stack   : (new Error()).stack
    });
  };

}());

(function () {
  'use strict';

  var ucfirst = MetaKGS.Util.ucfirst;
  var foreach = MetaKGS.Util.foreach;
  var keys    = MetaKGS.Util.keys;

  /* a wrapper around jQuery */

  var element = function (args) {
    var spec = args || {};

    var that = {
      $context       : spec.$context       || $(),
      namespace      : spec.namespace      || '',
      eventNamespace : spec.eventNamespace || 'metakgs',
      activeClass    : spec.activeClass    || '+active',
      disabledClass  : spec.disabledClass  || '+disabled',
      hideClass      : spec.hideClass      || '+hide',
      elementBuilder : spec.elementBuilder || element
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

    that.buildElement = function (args) {
      var builder = this.elementBuilder;

      var spec = {
        activeClass    : this.activeClass,
        disabledClass  : this.disabledClass,
        hideClass      : this.hideClass,
        elementBuilder : this.elementBuilder
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return builder( spec );
    };

    that.find = function (name) {
      return this.buildElement({
        $context       : this.$context.find( '.'+this.classNameFor(name) ),
        namespace      : this.classNameFor( name ),
        eventNamespace : this.eventNamespaceFor( name )
      });
    };

    return that;
  };

  MetaKGS.element = element;

}());

(function () {
  'use strict';

  var keys    = MetaKGS.Util.keys;
  var foreach = MetaKGS.Util.foreach;

  var component = function (args) {
    var spec = args || {};
    var that = spec.context ? Object.create(spec.context) : MetaKGS.element(spec);

    that.render = function (args) {
      throw MetaKGS.notImplementedError("call to abstract method 'render'");
    };

    that.clear = function (args) {
      throw MetaKGS.notImplementedError("call to abstract method 'clear'");
    };

    return that;
  };

  component.list = function (args) {
    var spec = args || {};
    var that = component( spec );

    that.items = [];
    that.itemBuilder = spec.itemBuilder || component.list.item;

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
      var builder = this.itemBuilder;

      var spec = {
        context: this.buildElement({
          $context       : this.$itemTemplate.clone(),
          namespace      : this.classNameFor('item'),
          eventNamespace : this.eventNamespaceFor('item')
        })
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return builder( spec );
    };
 
    that.eachItem = function (callback) {
      foreach( this.items, callback );
    };

    that.clearItems = function () {
      var that = this;

      this.eachItem(function (item) {
        item.clear();
        item.$context.remove();
      });

      this.items.length = 0;

      return;
    };

    that.addItem = function (item) {
      this.$context.append( item.$context );
      this.items.push( item );
    };

    return that;
  };

  component.list.item = function (args) {
    var spec = args || {};
    var that = component( spec );

    return that;
  };

  MetaKGS.component = component;

}());

(function () {
  'use strict';

  var app = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.call = function () {
      throw MetaKGS.notImplementedError("call to abstract method 'call'");
    };

    return that;
  };

  MetaKGS.app = app;

}());

(function () {
  'use strict';

  /* app runner */

  var keys    = MetaKGS.Util.keys;
  var foreach = MetaKGS.Util.foreach;
  var ucfirst = MetaKGS.Util.ucfirst;

  $(document).ready(function () {
    foreach(keys(MetaKGS.app), function (name) {
      var builder = MetaKGS.app[name];

      $('[data-app="'+name+'"]').each(function () {
        try {
          var $this = $(this);
          var data = $this.data();

          var app = builder({
            $context       : $this,
            namespace      : data.namespace || 'js-'+name,
            eventNamespace : 'metakgs'+ucfirst(name),
            activeClass    : data.activeClass,
            hideClass      : data.hideClass,
            disabledClass  : data.disabledClass
          });

          app.call();
        }
        catch (error) {
          console.log( "Failed to run app '"+name+"': "+error );
        }
      });
    });
  });

}());

(function () {
  'use strict';

  var keys    = MetaKGS.Util.keys;
  var foreach = MetaKGS.Util.foreach;

  var client = function (args) {
    var spec = args || {};

    var that = {
      baseUrl: spec.baseUrl || '',
      onError: spec.onError || function (error) { throw error; },
      queryBuilder: spec.queryBuilder || client.query,
      responseBuilder: spec.responseBuilder || client.response
    };

    that.buildQuery = function (args) {
      var builder = this.queryBuilder;

      var spec = {
        baseUrl: this.baseUrl
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return builder( spec );
    };

    that.buildResponse = function (args) {
      var builder = this.responseBuilder;

      var spec = {
        client: this
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return builder( spec );
    };

    that.query = function (args, callback) {
      var that = this;
      var query = this.buildQuery( args );
      var onError = this.onError;

      $.ajax({
        type : 'GET',
        url  : query.toUrl()
      }).
      done(function (data, textStatus, jqXHR) {
        try {
          callback(that.buildResponse({
            query : query,
            xhr   : jqXHR,
            body  : jqXHR.status === 200 ? data : null
          }));
        }
        catch (error) {
          onError( error );
        }
      }).
      fail(function (jqXHR, textStatus, errorThrown) {
        try {
          if ( jqXHR.status === 0 ) {
            if ( textStatus === 'timeout' ) {
              throw MetaKGS.timoutError('Request timed out');
            }
            else if ( textStatus === 'abort' ) {
              throw MetaKGS.connectionFailed('Request aborted');
            }
            else {
              throw MetaKGS.connectionFailed('Failed to GET '+this.url);
            }
          }
          else {
            callback(that.buildResponse({
              query : query,
              xhr   : jqXHR
            }));
          }
        }
        catch (error) {
          onError( error );
        }
      });

      return;
    };

    return that;
  };

  client.query = function (args) {
    var spec = args || {};

    var that = {
      baseUrl: spec.baseUrl || ''
    };

    that.urlFor = function (path) {
      return path.match(/^https?:\/\//) ? path : (this.baseUrl + path);
    };

    that.toUrl = function () {
      throw MetaKGS.notImplementedError("call to abstract method 'toUrl'");
    };

    return that;
  };

  client.response = function (args) {
    var spec = args || {};
    var body = spec.body;

    var that = {
      client : spec.client,
      query  : spec.query,
      xhr    : spec.xhr
    };

    foreach(['query', 'client', 'xhr'], function (attr) {
      if ( !that[attr] ) {
        throw MetaKGS.argumentError("'"+attr+"' is required");
      }
    });

    that.source = body && {
      url          : body.request_url,
      responseDate : new Date( body.responded_at ),
      requestDate  : new Date( body.requested_at )
    };

    that.header = (function () {
      var xhr = that.xhr;

      return {
        get: function (field) { return xhr.getResponseHeader(field); },
        toString: function () { return xhr.getAllResponseHeaders(); }
      };
    }());

    that.getStatus = function () {
      return this.xhr.status;
    };
 
    that.getDate = function () {
      var date = this.header.get('Date');
      return date && new Date(date);
    };

    that.getRetryAfter = function () {
      var retryAfter = this.header.get('Retry-After');
      var date;

      if ( retryAfter && retryAfter.match(/^\d+$/) ) {
        date = this.getDate() || new Date();
        date.setSeconds( date.getSeconds()+parseInt(retryAfter, 10) );
      }
      else if ( retryAfter ) {
        date = new Date( retryAfter );
      }

      return date;
    };

    that.buildQuery = function (args) {
      return this.client.buildQuery(args);
    };

    that.buildUser = function (args) {
      var spec = {
        baseUrl: this.client.baseUrl
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return client.response.user(spec);
    };

    that.buildGame = function (args) {
      var that = this;

      var spec = {
        userBuilder: function (args) { return that.buildUser(args); },
        baseUrl: this.client.baseUrl
      };

      foreach(keys(args || {}), function (key) {
        spec[key] = args[key];
      });

      return client.response.game(spec);
    };

    return that;
  };

  client.response.user = function (args) {
    var spec = args || {};
    var user = spec.user;

    var that = {
      baseUrl: spec.baseUrl || ''
    };

    if ( !user ) {
      throw MetaKGS.argumentError("'user' is required");
    }

    that.name = user.name;
    that.rank = user.rank;
    that.position = user.position;

    that.hasRank = function () {
      return (this.rank && this.rank !== '-') ? true : false;
    };

    that.getHtmlUrl = function () {
      return this.baseUrl + '/users/' + this.name;
    };

    return that;
  };

  client.response.game = function (args) {
    var spec = args || {};
    var game = spec.game;
    var userBuilder = spec.userBuilder || client.response.user;

    var that = {
      baseUrl: spec.baseUrl || ''
    };

    if ( !game ) {
      throw MetaKGS.argumentError("'game' is required");
    }

    that.sgfUrl    = game.sgf_url;
    that.boardSize = game.board_size;
    that.handicap  = game.handicap || 0;
    that.result    = game.result;
    that.date      = new Date( game.started_at );

    that.type = {
      'Review'       : 'Demonstration',
      'Rengo Review' : 'Demonstration',
      'Simul'        : 'Simultaneous'
    }[game.type] || game.type;

    foreach(['white', 'black'], function (role) {
      var players = [];

      foreach(game[role] || [], function (user) {
        players.push(userBuilder({
          user: user
        }));
      });

      that[role] = players;
    });

    that.isPrivate = function () {
      return !this.sgfUrl;
    };

    that.getShortType = function () {
       return {
        'Demonstration' : 'Demo',
        'Simultaneous'  : 'Simul',
        'Tournament'    : 'Tourn'
      }[this.type] || this.type;
    };

    that.getTypeInitial = function () {
      return {
        'Demonstration' : 'D',
        'Free'          : 'F',
        'Ranked'        : 'R',
        'Rengo'         : '2',
        'Simultaneous'  : 'S',
        'Teaching'      : 'T',
        'Tournament'    : '*'
      }[this.type];
    };

    that.isDraw = function () {
      return this.result === 'Draw';
    };

    that.isFinished = function () {
      return this.result !== 'Unfinished';
    };

    that.wonBy = function (name) {
      var winners = this.result.match(/^([WB])\+/);
          winners = winners && this[ winners[1] === 'W' ? 'white' : 'black' ];

      var found = false;
      foreach(winners || [], function (winner) {
        if ( winner.name.toLowerCase() === name.toLowerCase() ) {
          found = true;
          return false;
        }
      });

      return found;
    };

    that.getHtmlUrl = function () {
      var path = this.sgfUrl && this.sgfUrl.match(/(\/games\/.*)\.sgf$/);
      return path && (this.baseUrl + path[1]);
    };

    that.getSetup = function () {
      var setup = this.boardSize + '\u00D7' + this.boardSize;
      setup += this.handicap ? ' H'+this.handicap : '';
      return setup;
    };

    return that;
  };

  MetaKGS.client = client;

}());

(function () {
  'use strict';

  var foreach = MetaKGS.Util.foreach;

  var top100 = function (args) {
    var spec = args || {};
    var that = MetaKGS.client( spec );

    that.queryBuilder    = spec.queryBuilder    || top100.query;
    that.responseBuilder = spec.responseBuilder || top100.response;

    return that;
  };

  top100.query = function (args) {
    var spec = args || {};
    var that = MetaKGS.client.query( spec );

    that.toUrl = function () {
      return this.urlFor('/api/top100');
    };

    return that;
  };

  top100.response = function (args) {
    var spec = args || {};
    var body = spec.body;
    var that = MetaKGS.client.response( spec );

    that.content = body && (function () {
      var content = body.content;
      var players = [];

      foreach(content.players, function (player) {
        players.push(that.buildUser({
          user: player
        }));
      });

      return {
        players: players
      };
    }());

    return that;
  };

  MetaKGS.client.top100 = top100;

}());

(function () {
  'use strict';

  var foreach   = MetaKGS.Util.foreach;
  var isString  = MetaKGS.Util.isString;
  var isInteger = MetaKGS.Util.isInteger;

  var archives = function (args) {
    var spec = args || {};
    var that = MetaKGS.client( spec );

    that.queryBuilder    = spec.queryBuilder    || archives.query;
    that.responseBuilder = spec.responseBuilder || archives.response;

    return that;
  };

  archives.query = function (args) {
    var spec = args || {};
    var that = MetaKGS.client.query( spec );

    foreach(['user', 'year', 'month'], function (key) {
      if ( !spec.hasOwnProperty(key) ) {
        throw MetaKGS.argumentError("'"+key+"' is required");
      }
    });

    if ( !isString(spec.user) || !spec.user.match(/^[a-z][a-z0-9]{0,9}$/i) ) {
      throw MetaKGS.argumentError("Invalid 'user': "+spec.user);
    }

    if ( !isInteger(spec.year) || spec.year < 2000 ) {
      throw MetaKGS.argumentError("Invalid 'year': "+spec.year);
    }

    if ( !isInteger(spec.month) || spec.month < 1 || spec.month > 12 ) {
      throw MetaKGS.argumentError("Invalid 'month': "+spec.month);
    }

    that.user = spec.user;
    that.year = spec.year;
    that.month = spec.month;

    that.toUrl = function () {
      return this.urlFor('/api/archives/'+this.user+'/'+this.year+'/'+this.month);
    };

    that.toHtmlUrl = function () {
      return this.urlFor('/users/'+this.user+'/games/'+this.year+'/'+this.month);
    };

    return that;
  };

  archives.response = function (args) {
    var spec = args || {};
    var body = spec.body;
    var that = MetaKGS.client.response( spec );

    that.queries = (function () {
      var start = ((body && body.queries) || [])[0];
      var now = new Date();

      var end = {
        year  : now.getUTCFullYear(),
        month : now.getUTCMonth() + 1
      };

      var queries = [];
      var user = that.query.user;
      var year, month;

      if ( !start ) {
        return null;
      }

      for (
        year = start.year;
        year <= end.year;
        year += 1
      ) {
        for (
          month = year === start.year ? start.month : 1;
          month <= (year === end.year ? end.month : 12);
          month += 1
        ) {
          queries.push(that.buildQuery({
            user  : user,
            year  : year,
            month : month
          }));
        }
      }

      return queries;
    }());

    that.link = (function () {
      var query = that.query;
      var queries = that.queries;

      var last = queries && queries.length && (queries.length - 1);
      var self;

      if ( !queries ) {
        return null;
      }

      foreach(queries, function (q, i) {
        if ( q.year === query.year && q.month === query.month ) {
          self = i;
          return false;
        }
      });

      return {
        first : (self !== 0    ? queries[0]      : null),
        prev  : (self > 0      ? queries[self-1] : null),
        next  : (self < last   ? queries[self+1] : null),
        last  : (self !== last ? queries[last]   : null)
      };
    }());
 
    that.content = body && (function () {
      var content = body.content;
 
      var games = (function () {
        var gameObjects = [];

        if ( !content.games ) {
          return null;
        }

        foreach(content.games, function (game) {
          gameObjects.push(that.buildGame({
            game: game
          }));
        });

        return gameObjects;
      }());

      return {
        games  : games,
        zipUrl : content.zip_url,
        tgzUrl : content.tgz_url
      };
    }());

    return that;
  };

  MetaKGS.client.archives = archives;

}());

(function () {
  'use strict';

  var Component = {};

  /*
   *  Navbar
   */

  Component.Navbar = {
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
  
  MetaKGS.Component = Component;

}());

(function () {
  'use strict';

  var App = {};

  MetaKGS.App = App;

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


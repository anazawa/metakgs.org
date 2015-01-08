(function() {
  'use strict';

  /*
   * Relations between objects:
   *
   *   Archives
   *     isa Archives.Component
   *     has Archives.Calendar
   *     has Archives.GameList
   *     has Archives.Error
   *
   *   Archives.Calendar
   *     isa Archives.Component
   *     has Archives.Calendar.Date
   *              
   *   Archives.Calendar.Date
   *     isa Archives.Component
   *
   *   Archives.GameList
   *     isa Archives.Component
   *     has Archives.GameList.Item
   *
   *   Archives.GameList.Item
   *     isa Archives.Component
   *     has Archives.GameList.Player
   *
   *   Archives.GameList.Player
   *     isa Archives.Component
   *
   *   Archives.Error
   *     isa Archives.Component
   *
   */

  var foreach = MetaKGS.Util.foreach;
 
  var MON_LIST = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  var FULLMON_LIST = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  var Archives = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.user = spec.user || that.$context.data('user');
    that.year = spec.year || that.$context.data('year');
    that.month = spec.month || that.$context.data('month');

    that.apiEndpoint = spec.apiEndpoint || '/api';
    that.http = Archives.HTTP();

    that.model = Archives.Model({
      apiEndpoint: spec.apiEndpoint
    });

    that.gameList = Archives.GameList({
      classNamePrefix: that.classNameFor('gamelist') + '-',
      eventNamespace: that.eventNamespace + 'GameList',
      $context: that.find( 'gamelist' )
    });

    that.calendar = Archives.Calendar({
      classNamePrefix: that.classNameFor('calendar') + '-',
      eventNamespace: that.eventNamespace + 'Calendar',
      $context: that.find( 'calendar' )
    });

    that.error = Archives.Error({
      classNamePrefix: that.classNameFor('error') + '-',
      eventNamespace: that.eventNamespace + 'Error',
      $context: that.find( 'error' )
    });

    that.uriFor = function (args) {
      var path = [ 'archives', args.user, args.year, args.month ];
      return this.apiEndpoint + '/' + path.join('/');
    };

    that.buildQueries = function (args) {
      var first = args.first;
      var user = this.user;
      var queries = [];

      var now = new Date();
      var year = now.getUTCFullYear();
      var month = now.getUTCMonth() + 1;

      var uri;

      eachYear:
      for (; year >= 2000; year-- ) {
        for ( month = month || 12; month > 0; month-- ) {
          uri = this.uriFor({
            user: user,
            year: year,
            month: month
          });

          queries.push({
            year: year,
            month: month,
            uri: uri
          });

          if ( uri === first ) {
            break eachYear;
          }
        }
      }

      queries.reverse();

      return queries;
    };

    that.start = function () {
      this.call();
    };

    that.call = function (args) {
      var that = this;
      var uri = args && args.uri;

      if ( !uri ) {
        uri = this.uriFor({
          user: this.user,
          year: this.year,
          month: this.month
        });
      }

      this.render({ loading: true });

      this.http.get(uri, function (response) {
        if ( response.code === 200 ) {
          that.onSuccess( response );
        }
        else {
          that.onFail( response );
        }
      });

      return;
    };

    that.onSuccess = function (response) {
      var that = this;
      var content = response.body.content;
      var queries = this.queries;
      var games = [];

      if ( !queries ) {
        queries = this.buildQueries({ first: response.body.link.first });
        this.queries = queries;
      }

      foreach(queries, function(query) {
        if ( query.uri === response.request.uri ) {
          that.year = query.year;
          that.month = query.month;
          return false;
        }
      });

      foreach(content.games, function (game) {
        games.push( Archives.Game(game) );
      });

      this.render({
        games: games
      });

      this.bind();

      return;
    };

    that.onFail = function (response) {
      var code = response.code;

      if ( code === 202 ) {
        this.render({
          error: {
            name: 'Accepted',
            message: 'Your request has been accepted for processing, '
                   + 'but the processing has not been completed yet. '
                   + 'Retry after one hour.'
          }
        });
      }
      else if ( code === 404 ) {
        this.render({
          error: {
            name: 'Not Found',
            message: 'The requested user "'+this.user+'" was not found.'
          }
        });
      }

      return;
    };

    that.getLink = function () {
      var year = this.year;
      var month = this.month;
      var queries = this.queries;
      var last = queries.length - 1;
      var i = 0;

      foreach(queries, function (query) {
        if ( query.year === year && query.month === month ) {
          return false;
        }
        i += 1;
      });

      return {
        first : i !== 0    && queries[0],
        prev  : i > 0      && queries[i-1],
        self  :               queries[i],
        next  : i < last   && queries[i+1],
        last  : i !== last && queries[last-1]
      };
    };

    that.render = function (args) {
      var that = this;
      var user = this.user;
      var year = this.year;
      var month = this.month;
      var games = args.games;
      var error = args.error;
      var calendar = this.calendar;

      if ( args.loading ) {
        this.find('if-isloading').show();
        return;
      }

      this.error.render( error );

      if ( error ) {
        if ( error.name === 'Not Found' ) {
          this.find('calendar').hide();
          this.find('gamelist').hide();
        }
        this.find('if-isloading').hide();
        return;
      }

      var link = this.getLink();

      this.calendar.render({
        user  : user,
        year  : year,
        month : month,
        games : games
      });

      foreach(['first', 'prev', 'next', 'last'], function (rel) {
        if ( link[rel] ) {
          calendar.find('show-'+rel+'month').removeClass('disabled');
        }
        else {
          calendar.find('show-'+rel+'month').addClass('disabled');
        }
      });

      /*
      this.gameList.render({
        year: year,
        month: month,
        games: games
      });
      */

      this.gameList.render({
        games: games,
        query: {
          year: year,
          month: month
        }
      });

      this.find('if-isloading').hide();

      this.games = games;

      return;
    };

    that.bind = function (args) {
      var that = this;
      var link = this.getLink();
      var calendar = this.calendar;
      var gameList = this.gameList;
      var click = this.eventNameFor( 'click' );

      calendar.eachDate(function (date) {
        date.find('show-games').off(click).on(click, function () {
          /*
          gameList.render({
            year  : date.year,
            month : date.month,
            day   : date.day,
            games : date.games
          });
          */
          gameList.render({
            games: date.games,
            query: {
              year: date.year,
              month: date.month,
              day: date.day
            }
          });
        });
      });

      calendar.find('show-allgames').off(click).on(click, function () {
        that.gameList.render({
          year  : that.year,
          month : that.month,
          games : that.games
        });
      });

      calendar.find('show-firstmonth').off(click).on(click, function () {
        that.call({ uri: link.first.uri });
      });

      calendar.find('show-prevmonth').off(click).on(click, function () {
        that.call({ uri: link.prev.uri });
      });

      calendar.find('show-nextmonth').off(click).on(click, function () {
        that.call({ uri: link.next.uri });
      });

      calendar.find('show-lastmonth').off(click).on(click, function () {
        that.call({ uri: link.last.uri });
      });

      this.calendar.bind();
      //this.gameList.bind();
      this.error.bind();

      return;
    };

    return that;
  };

  Archives.Calendar = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.year = spec.year;
    that.month = spec.month;
    that.dates = null;

    that.$dateTemplate = (function () {
      var $template = that.find( 'date-template' );
      var $dateList = $template.parent();
      var $clone = $template.clone();

      $template.remove();

      $clone.removeClass( that.classNameFor('date-template') );
      $clone.addClass( that.classNameFor('date') );

      that.$dateList = $dateList;

      return $clone;
    }());

    that.eachDate = function (callback) {
      foreach( this.dates, callback );
    };

    that.buildDates = function (args) {
      var that = this;
      var user = args.user;
      var games = args.games || [];
      var year = args.year;
      var month = args.month;
      var classNamePrefix = this.classNameFor('date') + '-';
      var eventNamespace = this.eventNamespace + 'Date';
      var $template = this.$dateTemplate;

      var prevYear = month === 1 ? year - 1 : year;
      var prevMonth = month === 1 ? 12 : month - 1;
      var nextYear = month === 12 ? year + 1 : year;
      var nextMonth = month === 12 ? 1 : month + 1;

      var prevMonthLast = new Date( year, month-1, 0 );
      var first = new Date( year, month-1, 1 );
      var last = new Date( year, month, 0 );

      var dates = [];
      var gamesOf = [];
      var dateObjects = [];

      var day;

      for (
        day = prevMonthLast.getDate() - first.getDay() + 1;
        day <= prevMonthLast.getDate();
        day += 1
      ) {
        dates.push({
          year  : prevYear,
          month : prevMonth,
          day   : day
        });
      }

      for ( day = 1; day <= last.getDate(); day++ ) { 
        dates.push({
          year  : year,
          month : month,
          day   : day,
          games : gamesOf[day] = []
        });
      }

      for ( day = 1; day <= 6-last.getDay(); day++ ) {
        dates.push({
          year  : nextYear,
          month : nextMonth,
          day   : day
        });
      }

      foreach(games, function (game) {
        gamesOf[ game.date.getUTCDate() ].push( game );
      });

      foreach(dates, function (date) {
        dateObjects.push(Archives.Calendar.Date({
          $context        : $template.clone(),
          classNamePrefix : classNamePrefix,
          eventNamespace  : eventNamespace,
          user  : user,
          year  : date.year,
          month : date.month,
          day   : date.day,
          games : date.games
        }));
      });

      return dateObjects;
    };

    that.render = function (args) {
      var that = this;
      var user = args && args.user;
      var games = args && args.games;
      var year = args && args.year || this.year;
      var month = args && args.month || this.month;
      var $dateList = this.$dateList;

      var dates = this.buildDates({
        user  : user,
        year  : year,
        month : month,
        games : games
      });

      this.find( 'date', $dateList ).remove();

      this.find('year').text( year );
      this.find('month').text( FULLMON_LIST[month-1] );

      foreach(dates, function (date) {
        var $date = date.$context;

        date.render();

        if ( date.year !== year || date.month !== month ) {
          $date.addClass( 'disabled' );
        }
 
        $dateList.append( $date );
      });

      this.year = year;
      this.month = month;
      this.dates = dates;
      
      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor('click');
      var $dates = this.find( 'date', this.$dateList );

      this.find('show-allgames').on(click, function () {
        $dates.removeClass( 'active' );
      });

      this.eachDate(function (date) {
        var $date = date.$context;

        if ( date.year === that.year && date.month === that.month ) {
          $date.on(click, function () {
            $dates.removeClass( 'active' );
            $( this ).addClass( 'active' );
          });
        }

        date.bind();
      });

      return;
    };

    return that;
  };

  Archives.Calendar.Date = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.year = spec.year;
    that.month = spec.month;
    that.day = spec.day;

    that.user = spec.user;
    that.games = spec.games || [];

    that.render = function (args) {
      var that = this;
      var user = args && args.user || this.user;
      var games = args && args.games || this.games;
      var day = args && args.day || this.day;

      var gamesCount = {
        games  : games.length,
        wins   : 0,
        losses : 0,
        draws  : 0
      };
 
      foreach(games, function (game) {
        if ( !game.isFinished() ) {
          return;
        }
        else if ( game.isDraw() ) {
          gamesCount.draws += 1;
        }
        else if ( game.wonBy(user) ) {
          gamesCount.wins += 1;
        }
        else {
          gamesCount.losses += 1;
        }
      });

      this.find('day').text( day );

      foreach(Object.keys(gamesCount), function (key) {
        var $item = that.find( key );
        var $itemCount = that.find( key+'-count', $item );

        if ( gamesCount[key] ) {
          $itemCount.text( gamesCount[key] );
          $item.show();
        }
        else {
          $item.hide();
        }
      });

      this.day = day;
      this.user = user;
      this.games = games;

      return;
    };

    that.bind = function () {
      // nothing to bind
    };

    return that;
  };

  Archives.GameList = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    //that.year = spec.year;
    //that.month = spec.month;
    //that.day = null;
    that.query = spec.query;
    that.games = spec.games;
    that.items = null;

    that.page = Archives.Page({
      entriesPerPage: that.$context.data('perpage'),
      totalEntries: (that.games || []).length
    });

    that.$itemTemplate = (function () {
      var $template = that.find( 'item-template' );
      var $clone = $template.clone();
      var $list = $template.parent();

      $clone.removeClass( that.classNameFor('item-template') );
      $clone.addClass( that.classNameFor('item') );

      $template.remove();

      that.$list = $list;

      return $clone;
    }());

    that.buildItems = function (args) {
      var that = this;
      var games = args || [];
      var $template = this.$itemTemplate;
      var classNamePrefix = this.classNameFor('item') + '-';
      var eventNamespace = this.eventNamespace + 'Item';
      var items = [];

      foreach(games, function (game) {
        items.push(Archives.GameList.Item({
          classNamePrefix: classNamePrefix,
          eventNamespace: eventNamespace,
          $context: $template.clone(),
          game: game
        }));
      });

      return items;
    };

    that.eachItem = function (callback) {
      if ( this.items ) {
        foreach( this.items, callback );
      }
    };

    that.sortByWhite = function (args) {
      return this.sort(args, {
        asc: function (a, b) {
        }
      });
    };

    that.sortBySetup = function (args) {
      return this.sort(args, {
        asc: function (a, b) {
          return a.boardSize - b.boardSize
              || a.handicap  - b.handicap
              || a.date      - b.date;
        },
        desc: function (a, b) {
          return b.boardSize - a.boardSize
              || b.handicap  - a.handicap
              || a.date      - b.date;
        }
      });
    };

    that.sortByResult = function (args) {
      var getScore = /^([BW])\+(\d+\.\d+)$/;

      var make = function (arg) {
        var dir = arg === 'desc' ? -1 : 1;

        return function (a, b) {
          var aScore = getScore.exec( a.result );
          var bScore = getScore.exec( b.result );

          if ( a.result === b.result ) {
            return a.date - b.date;
          }

          if ( aScore && bScore && aScore[1] === bScore[1] ) {
            return dir * (parseFloat(aScore[2]) - parseFloat(bScore[2]));
          }

          return a.result > b.result ? dir : -dir;
        };
      };
 
      return this.sort(args, {
        asc  : make('asc'),
        desc : make('desc')
      });
    };

    that.sortByDate = function (args) {
      return this.sort(args, {
        asc: function (a, b) { return a.date - b.date; }
      });
    };

    that.sort = function (args, callback) {
      var toggle = (args && args.toggle === true) || false;
      var games = this.games.slice(0).sort(callback.asc);
      var isSorted = true;
      var i;

      if ( toggle ) {
        for ( i = 0; i < games.length; i++ ) {
          if ( games[i].date - this.games[i].date !== 0 ) {
            isSorted = false;
            break;
          }
        }
        if ( isSorted && callback.desc ) {
          games.sort( callback.desc );
        }
        else if ( isSorted ) {
          games.reverse();
        }
      }

      this.games = games;

      return this;
    };

    that.render = function (args) {
      var that = this;
      var games = (args && args.games) || this.games;
      var page = args && args.page;
      var query = (args && args.query) ? args.query : this.query;
      //var year = (args && args.games) ? args.year : this.year;
      //var month = (args && args.games) ? args.month : this.month;
      //var day = (args && args.games) ? args.day : this.day;
      var $list = this.$list;

      var pageObject = Archives.Page({
        entriesPerPage: this.page.entriesPerPage,
        totalEntries: games.length,
        currentPage: (args && args.games) ? 1 : (page || this.page.currentPage)
      });

      var items = this.buildItems( pageObject.slice(games) );

      var dateRange = FULLMON_LIST[query.month-1];
          dateRange += query.day ? ' '+query.day+', ' : ' ';
          dateRange += query.year;

      var pageRange = pageObject.toString();

      this.unbind();
      this.find( 'item', $list ).remove();

      if ( pageObject.getPreviousPage() ) {
        this.find('show-prevpage').removeClass('disabled');
      }
      else {
        this.find('show-prevpage').addClass('disabled');
      }

      if ( pageObject.getNextPage() ) {
        this.find('show-nextpage').removeClass('disabled');
      }
      else {
        this.find('show-nextpage').addClass('disabled');
      }

      this.find('daterange').text( dateRange );
      this.find('page-range').text( pageRange );

      // XXX
      if ( games.length ) {
        this.find('if-hasgames').show();
      }
      else {
        this.find('if-hasgames').hide();
      }

      foreach(items, function (item) {
        item.render();
        $list.append( item.$context );
      });

      this.page = pageObject;
      this.items = items;
      //this.year = year;
      //this.month = month;
      //this.day = day;
      this.query = query;
      this.games = games;

      this.bind();

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

      this.eachItem(function (item) {
        item.bind();
      });

      this.find('sort-bydate').on(click, function () {
        that.sortByDate({ toggle: true }).render({ page: 1 });
      });

      this.find('sort-bysetup').on(click, function () {
        that.sortBySetup({ toggle: true }).render({ page: 1 });
      });

      this.find('sort-byresult').on(click, function () {
        that.sortByResult({ toggle: true }).render({ page: 1 });
      });

      this.find('show-prevpage').on(click, function () {
        that.render({ page: that.page.getPreviousPage() });
      });

      this.find('show-nextpage').on(click, function () {
        that.render({ page: that.page.getNextPage() });
      });

      return;
    };

    that.unbind = function () {
      var click = this.eventNameFor( 'click' );

      this.eachItem(function (item) {
        item.unbind();
      });

      this.find('sort-bydate').off( click );
      this.find('sort-bysetup').off( click );
      this.find('sort-byresult').off( click );
      this.find('show-prevpage').off( click );
      this.find('show-nextpage').off( click );

      return;
    };

    return that;
  };

  Archives.GameList.Item = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.game = spec.game;

    that.buildPlayers = function (role, args) {
      var that = this;
      var users = args || [];
      var players = [];

      foreach([0, 1], function (i) {
        var user = users[i];
        var className = role + (i + 1);

        players.push(Archives.GameList.Player({
          classNamePrefix: that.classNameFor(className) + '-',
          eventNamespace: that.eventNamespace + 'Player',
          $context: that.find( className ),
          user: user
        }));
      });

      return players;
    };

    that.white = spec.game && that.buildPlayers('white', spec.game.white);
    that.black = spec.game && that.buildPlayers('black', spec.game.black);

    that.eachPlayer = function (callback) {
      if ( this.white && this.black ) {
        foreach( [].concat(this.white, this.black), callback );
      }
    };

    that.render = function (args) {
      var game = (args && args.game) || this.game;
      var white = this.buildPlayers( 'white', game.white );
      var black = this.buildPlayers( 'black', game.black );

      var typeInitial = game.getTypeInitial();

      var setup = game.boardSize + '\u00D7' + game.boardSize;
          setup += game.handicap ? ' H'+game.handicap : '';

      var result = game.result;

      var date = MON_LIST[ game.date.getUTCMonth() ];
          date += ' ' + game.date.getUTCDate();
          date += " '" + (''+game.date.getUTCFullYear()).slice(-2);
          date += ' at ' + ('0'+game.date.getUTCHours()).slice(-2);
          date += ':' + ('0'+game.date.getUTCMinutes()).slice(-2);

      this.unbind();

      if ( game.isPrivate() ) {
        this.$context.addClass( this.classNameFor('private') );
      }
      else {
        this.$context.removeClass( this.classNameFor('private') );
      }

      this.find('typeinitial').text( typeInitial );
      this.find('setup').text( setup );
      this.find('result').text( result );
      this.find('date').text( date );

      foreach([].concat(white, black), function (player) {
        player.render();
      });

      this.game = game;
      this.white = white;
      this.black = black;

      this.bind();

      return;
    };

    that.bind = function () {
      this.eachPlayer(function (player) {
        player.bind();
      });
    };

    that.unbind = function () {
      this.eachPlayer(function (player) {
        player.unbind();
      });
    };

    return that;
  };

  Archives.GameList.Player = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.user = spec.user;

    that.render = function (args) {
      var user = (args && args.user) || this.user;
      var $name = this.find( 'name' );
      var $rank = this.find( 'rank' );

      this.unbind();

      if ( user ) {
        $name.text( user.name );
        $name.attr( 'href', user.getHtmlUrl() );
        $rank.text( user.hasRank() ? user.rank : '' );
      }
      else {
        this.$context.hide();
      }

      this.user = user;

      this.bind();

      return;
    };

    that.bind = function () {
      // nothing to bind
    };

    that.unbind = function () {
      // nothing to unbind
    };

    return that;
  };

  Archives.Error = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.render = function (args) {
      if ( args ) {
        this.find('name').text( args.name );
        this.find('message').text( args.message );
        this.$context.show();
      }
      else {
        this.$context.hide();
      }
    };

    that.bind = function () {
      // nothing to bind
    };

    return that;
  };

  Archives.Component = function (args) {
    var spec = args || {};
 
    var that = {
      $context: spec.$context || $(),
      classNamePrefix: spec.classNamePrefix || '',
      eventNamespace: spec.eventNamespace || 'metakgsArchives'
    };

    that.classNameFor = function (name) {
      return this.classNamePrefix + name;
    };

    that.find = function (name, $context) {
      var $c = $context || this.$context;
      return $c.find( '.'+this.classNameFor(name) );
    };

    that.eventNameFor = function (name) {
      return name + '.' + this.eventNamespace;
    };

    that.render = function () {
      throw new Error("call to abstract method 'render'");
    };

    that.bind = function () {
      throw new Error("call to abstract method 'bind'");
    };

    return that;
  };

  Archives.Model = function (args) {
    var spec = args || {};

    var that = {
      apiEndpoint: spec.apiEndpoint || '/api',
      http: Archives.HTTP()
    };

    that.buildQueries = function (args) {
      var first = args.first;
      var user = this.user;
      var queries = [];

      var now = new Date();
      var year = now.getUTCFullYear();
      var month = now.getUTCMonth() + 1;

      var uri;

      eachYear:
      for (; year >= 2000; year-- ) {
        for ( month = month || 12; month > 0; month-- ) {
          uri = this.uriFor({
            user: user,
            year: year,
            month: month
          });

          queries.push({
            year: year,
            month: month,
            uri: uri
          });

          if ( uri === first ) {
            break eachYear;
          }
        }
      }

      queries.reverse();

      return queries;
    };

    that.get = function (query, callback) {
      var that = this;
      var uri = this.uriFor('archives/'+query.user+'/'+query.year+'/'+query.month);

      this.http.get(uri, function (response) {
        var games;

        if ( !that.queries ) {
          that.queries = that.buildQueries({ first: response.body.link.first });
        }

        if ( response.code === 200 ){
          games = [];
          foreach(response.body.content.games, function (game) {
            games.push( Archives.Game(game) );
          });
        }

        callback({
          link: that.getLink(),
          games: games
        });
      });
    };

    return that;
  };

  Archives.User = function (args) {
    var that = {
      name: args.name,
      rank: args.rank
    };

    that.hasRank = function () {
      return this.rank && this.rank !== '-' ? true : false;
    };

    that.getHtmlUrl = function () {
      return '/users/' + this.name;
    };

    return that;
  };

  Archives.Game = function (args) {
    var that = {
      sgfUrl: args.sgf_url,
      boardSize: args.board_size,
      handicap: args.handicap || 0,
      date: new Date( args.started_at ),
      result: args.result
    };
    
    that.type = {
      'Review'       : 'Demonstration',
      'Rengo Review' : 'Demonstration',
      'Simul'        : 'Simultaneous'
    }[args.type] || args.type;

    foreach(['white', 'black'], function (role) {
      var players = [];

      foreach(args[role] || [], function (arg) {
        players.push( Archives.User(arg) );
      });

      that[role] = players;
    });

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

    that.wonBy = function (arg) {
      var name = arg.toLowerCase();
      var found = false;

      var winners = ( this.result.match(/^([WB])\+/) || [] )[1];
          winners = winners ? this[ winners === 'W' ? 'white' : 'black' ] : [];

      foreach(winners, function (winner) {
        if ( winner.name.toLowerCase() === name ) {
          found = true;
          return false;
        }
      });

      return found;
    };

    that.isFinished = function () {
      return this.result !== 'Unfinished';
    };

    that.isPrivate = function () {
      return !this.sgfUrl;
    };

    return that;
  };

  // ported from Data::Page on CPAN

  Archives.Page = function (args) {
    var spec = args || {};

    var that = {
      totalEntries: spec.totalEntries || 0,
      entriesPerPage: spec.entriesPerPage || 10,
      currentPage: spec.currentPage || 1
    };

    that.getFirstPage = function () {
      return 1;
    };

    that.getLastPage = function () {
      return Math.ceil( this.totalEntries/this.entriesPerPage );
    };

    that.getFirst = function () {
      return ((this.currentPage - 1) * this.entriesPerPage) + 1;
    };

    that.getLast = function () {
      if ( this.currentPage === this.getLastPage() ) {
        return this.totalEntries;
      }
      else {
        return this.currentPage * this.entriesPerPage;
      }
    };

    that.getPreviousPage = function () {
      return this.currentPage > 1 ? this.currentPage-1 : null;
    };

    that.getNextPage = function () {
      return this.currentPage < this.getLastPage() ? this.currentPage+1 : null;
    };

    that.slice = function (array) {
      var end = array.length > this.getLast() ? this.getLast() : array.length;
      return array.slice( this.getFirst()-1, end );
    };

    that.toString = function () {
      var first = MetaKGS.Util.commify( ''+this.getFirst() );
      var last = MetaKGS.Util.commify( ''+this.getLast() );
      var total = MetaKGS.Util.commify( ''+this.totalEntries );
      return first + '-' + last + ' of ' + total;
    };

    return that;
  };

  Archives.HTTP = function (args) {
    var spec = args || {};
    var that = {};

    that.get = function (url, callback) {
      var request = Archives.HTTP.Request({
        method: 'GET',
        uri: url
      });

      request.send( callback );

      return;
    };

    return that;
  };

  Archives.HTTP.Request = function (args) {
    var spec = args || {};

    var that = {
      method: spec.method,
      uri: spec.uri,
      body: null
    };

    that.send = function (callback) {
      var that = this;
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if ( this.readyState === 4 ) {
          callback(Archives.HTTP.Response({
            request: that,
            xhr: this
          }));
        }
      };

      xhr.open( this.method, this.uri );
      xhr.send( this.body );

      return;
    };

    return that;
  };

  Archives.HTTP.Response = function (args) {
    var spec = args || {};
    var xhr = spec.xhr;

    var that = {
      code: xhr.status,
      header: {
        get: function (field) { return xhr.getResponseHeader(field); },
        toString: function () { return xhr.getAllResponseHeaders(); }
      },
      request: spec.request
    };

    that.body = (function () {
      var body = xhr.responseText;

      var type = that.header.get('Content-Type') || '';
          type = type.split(/;\s*/)[0].replace(/\s+/, '');
          type = type.toLowerCase();

      switch (type) {
        case 'application/json':
          body = JSON.parse( body );
          break;
      }

      return body;
    }());

    that.date = (function () {
      var date = that.header.get('Date');
      return date && new Date(date);
    }());

    that.retryAfter = (function () {
      var retryAfter = that.header.get('Retry-After');
      var date;

      if ( retryAfter && retryAfter.match(/^\d+$/) ) {
        date = that.date ? new Date(that.date.getTime()) : new Date();
        date.setSeconds( date.getSeconds()+parseInt(retryAfter, 10) );
      }
      else if ( retryAfter ) {
        date = new Date( retryAfter );
      }

      return date;
    }());

    return that;
  };

  MetaKGS.App.Archives = Archives;

  $(document).ready(function () {
    var archives = MetaKGS.App.Archives({
      classNamePrefix: 'js-archives-',
      $context: $('.js-archives'),
      apiEndpoint: 'http://metakgs.org/api'
    });

    archives.start();
    console.log(archives);
  });

}());

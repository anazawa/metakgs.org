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

  function foreach (array, callback) {
    var i, last, length = array.length;
    for ( i = 0; i < length && !last; i++ ) {
      last = callback(array[i], i) === false;
    }
  }

  function commify (string) {
    return string.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var Archives = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.link = null;
    that.games = null;

    that.client = Archives.Client({
      baseUrl: spec.baseUrl
    });

    that.query = that.client.buildQuery(spec.query || {
      user  : that.$context.data('user'),
      year  : that.$context.data('year'),
      month : that.$context.data('month')
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

    that.yearList = Archives.YearList({
      classNamePrefix: that.classNameFor('yearlist') + '-',
      eventNamespace: that.eventNamespace + 'YearList',
      $context: that.find( 'yearlist' )
    });

    that.start = function () {
      this.call({ query: this.query });
    };

    that.call = function (args) {
      var that = this;
      var query = args.query;

      this.render({ loading: true });

      this.client.get(query, function (response) {
        var code = response.httpResponse.code;
        console.log(response);

        if ( code === 200 ) {
          that.render({
            query: response.query,
            queries: response.queries,
            link: response.link,
            games: response.games
          });
        }
        else if ( code === 202 ) {
          that.render({
            error: {
              name: 'Accepted',
              message: 'Your request has been accepted for processing, '
                     + 'but the processing has not been completed yet. '
                     + 'Retry after one hour.'
            }
          });
        }
        else if ( code === 404 ) {
          that.render({
            error: {
              name: 'Not Found',
              message: 'The requested user "'+query.user+'" was not found.'
            }
          });
        }
        else {
        }
      });

      return;
    };

    that.render = function (args) {
      var games = args.games;
      var error = args.error;
      var query = args.query;
      var link = args.link;
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

      this.unbind();

      calendar.render({
        query: query,
        games: games
      });

      foreach(['first', 'prev', 'next', 'last'], function (rel) {
        if ( link[rel] ) {
          //calendar.find('show-'+rel+'month').removeClass('disabled');
          calendar.find(rel+'month').removeClass('disabled');
          calendar.find(rel+'month').attr('href',link[rel].getHtmlUrl());
        }
        else {
          //calendar.find('show-'+rel+'month').addClass('disabled');
          calendar.find(rel+'month').addClass('disabled');
        }
      });

      this.gameList.render({
        games: games,
        query: query,
        range: {
          year: query.year,
          month: query.month
        }
      });

      this.yearList.render({
        queries: args.queries
      });

      this.find('if-isloading').hide();

      this.link = link;
      this.query = query;
      this.games = games;

      this.bind();

      return;
    };

    that.bind = function (args) {
      var that = this;
      var link = this.link;
      var query = this.query;
      var games = this.games;
      var calendar = this.calendar;
      var gameList = this.gameList;
      var click = this.eventNameFor( 'click' );

      calendar.find('show-allgames').on(click, function () {
        gameList.render({
          query: query,
          games: games,
          range: {
            year: query.year,
            month: query.month
          }
        });
      });

      calendar.eachDate(function (date) {
        if ( date.query.month === query.month ) {
          date.find('show-games').on(click, function () {
            gameList.render({
              query: date.query,
              games: date.games,
              range: {
                year: date.year,
                month: date.month,
                day: date.day
              }
            });
          });
        }
      });

      foreach(['first', 'prev', 'next', 'last'], function (rel) {
        if ( link[rel] ) {
          calendar.find('show-'+rel+'month').on(click, function () {
            that.call({ query: link[rel] });
          });
        }
      });

      return;
    };

    that.unbind = function () {
      var calendar = this.calendar;
      var click = this.eventNameFor( 'click' );

      foreach(['first', 'prev', 'next', 'last'], function (rel) {
        calendar.find('show-'+rel+'month').off( click );
      });

      calendar.find('show-allgames').off( click );

      calendar.eachDate(function (date) {
        date.find('show-games').off( click );
      });

      return;
    };

    return that;
  };

  Archives.Calendar = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.query = null;
    that.games = null;
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
      foreach( this.dates || [], callback );
    };

    that.buildDates = function (args) {
      var games = args.games || [];
      var user = args.query.user;
      var year = args.query.year;
      var month = args.query.month;
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
      var gamesOf = [null];
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
          $context: $template.clone(),
          classNamePrefix: classNamePrefix,
          eventNamespace: eventNamespace,
          //query: {
          //  user: user,
          //  year: date.year,
          //  month: date.month,
          //  day: date.day
          //},
          query: args.query,
          year: date.year,
          month: date.month,
          day: date.day,
          games: date.games
        }));
      });

      return dateObjects;
    };

    that.render = function (args) {
      var query = args ? args.query : this.query;
      var games = args ? args.games : this.games;
      var $dateList = this.$dateList;

      var dates = this.buildDates({
        query: query,
        games: games
      });

      this.unbind();
      this.find( 'date', $dateList ).remove();

      this.find('year').text( query.year );
      this.find('month').text( FULLMON_LIST[query.month-1] );

      foreach(dates, function (date) {
        var $date = date.$context;

        //if ( date.query.month !== query.month ) {
        if ( date.month === query.month ) {
          $date.removeClass( 'disabled' );
        }
        else {
          $date.addClass( 'disabled' );
        }

        date.render();
 
        $dateList.append( $date );
      });

      this.query = query;
      this.games = games;
      this.dates = dates;

      this.bind();

      return;
    };

    that.bind = function () {
      var that = this;
      var query = this.query;
      var dates = this.dates;
      var click = this.eventNameFor('click');

      this.find('show-allgames').on(click, function () {
        that.find( 'date', that.$dateList ).removeClass( 'active' );
      });

      this.eachDate(function (date) {
        //if ( date.query.month === query.month ) {
        if ( date.month === query.month ) {
          date.$context.on(click, function () {
            $(this).siblings().removeClass( 'active' );
            $(this).addClass( 'active' );
          });
        }
      });

      return;
    };

    that.unbind = function () {
      var click = this.eventNameFor('click');

      this.find('show-allgames').off( click );

      this.eachDate(function (date) {
        date.$context.off( click );
      });

      return;
    };

    return that;
  };

  Archives.Calendar.Date = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.query = spec.query;
    that.games = spec.games;
    that.year = spec.year;
    that.month = spec.month;
    that.day = spec.day;

    that.render = function (args) {
      var that = this;
      var year = (args && args.year) || this.year;
      var month = (args && args.month) || this.month;
      var day = (args && args.day) || this.day;
      var query = (args && args.query) || this.query;
      var games = (args && args.games) || this.games || [];

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
        else if ( game.wonBy(query.user) ) {
          gamesCount.wins += 1;
        }
        else {
          gamesCount.losses += 1;
        }
      });

      this.unbind();

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

      this.query = query;
      this.games = games;
      this.year = year;
      this.month = month;
      this.day = day;

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

  Archives.GameList = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.query = null;
    that.games = null;
    that.items = null;
    that.range = null;

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
      foreach( this.items || [], callback );
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
      var range = (args && args.range) || this.range;
      var games = (args && args.games) || this.games;
      var page = args && args.page;
      var query = (args && args.query) ? args.query : this.query;
      var $list = this.$list;

      var pageObject = Archives.Page({
        entriesPerPage: this.page.entriesPerPage,
        totalEntries: games.length,
        currentPage: (args && args.games) ? 1 : (page || this.page.currentPage)
      });

      var items = this.buildItems( pageObject.slice(games) );

      var dateRange = FULLMON_LIST[range.month-1];
          dateRange += range.day ? ' '+range.day+', ' : ' ';
          dateRange += range.year;

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
      this.query = query;
      this.games = games;
      this.range = range;

      this.bind();

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

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
      // nothing to bind
    };

    that.unbind = function () {
      // nothing to unbind
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
      this.unbind();
      if ( args ) {
        this.find('name').text( args.name );
        this.find('message').text( args.message );
        this.$context.show();
      }
      else {
        this.$context.hide();
      }
      this.bind();
    };

    that.bind = function () {
      // nothing to bind
    };

    that.unbind = function () {
      // nothing to unbind
    };

    return that;
  };

  Archives.YearList = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

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
      var queries = args.queries;
      var $template = this.$itemTemplate;
      var classNamePrefix = this.classNameFor('item') + '-';
      var eventNamespace = this.eventNamespace + 'Item';

      var first = queries[0];
      var last = queries[queries.length-1];
      var year;

      var queriesOf = [];
      var items = [];

      foreach(queries, function (query) {
        queriesOf[query.year] = queriesOf[query.year] || [];
        queriesOf[query.year][query.month] = query;
      });

      for ( year = first.year; year <= last.year; year++ ) {
        items.push(Archives.YearList.Item({
          classNamePrefix: classNamePrefix,
          eventNamespace: eventNamespace,
          $context: $template.clone(),
          queries: queriesOf[year],
          year: year
        }));
      }

      return items;
    };

    that.render = function (args) {
      var queries = (args && args.queries) || this.queries;
      var $list = this.$list;

      var items = this.buildItems({
        queries: queries
      });

      foreach(items, function (item) {
        item.render();
        $list.append( item.$context );
      });

      this.items = items;
      this.queries = queries;

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

  Archives.YearList.Item = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.year = spec.year;
    that.queries = spec.queries;

    that.render = function (args) {
      var year = (args && args.year) || this.year;
      var queries = (args && args.queries) || this.queries;

      this.unbind();

      this.find('year').text( year );

      this.find('monthlist-item').each(function (i) {
        if ( queries[i+1] ) {
          $(this).attr( 'href', queries[i+1].getHtmlUrl() );
        }
        else {
          $(this).addClass('disabled');
        }
      });

      this.year = year;
      this.queries = queries;

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

    that.render = function (args) {
      throw new Error("call to abstract method 'render'");
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
      var first = commify( ''+this.getFirst() );
      var last = commify( ''+this.getLast() );
      var total = commify( ''+this.totalEntries );
      return first + '-' + last + ' of ' + total;
    };

    return that;
  };

  Archives.Client = function (args) {
    var spec = args || {};

    var that = {
      baseUrl: spec.baseUrl || '',
      http: spec.http || Archives.HTTP()
    };

    that.buildQuery = function (args) {
      return Archives.Client.Query({
        baseUrl: this.baseUrl,
        user: args.user,
        year: args.year,
        month: args.month
      });
    };

    that.get = function (args, callback) {
      var that = this;
      var query = this.buildQuery( args );
      //var uri = this.apiEndpoint + '/archives/';
      //    uri += query.user + '/' + query.year + '/' + query.month;

      //this.http.get(uri, function (response) {
      this.http.get(query.getUrl(), function (response) {
        callback(Archives.Client.Response({
          httpResponse: response,
          query: query,
          client: that
        }));
      });
    };

    return that;
  };

  Archives.Client.Response = function (args) {
    var that = {
      httpResponse: args.httpResponse,
      query: args.query,
      client: args.client
    };

    that.queries = (function () {
      var client = that.client;
      var body = that.httpResponse.body;
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
          queries.push(client.buildQuery({
            user: user,
            year: year,
            month: month
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
 
    that.games = (function () {
      var body = that.httpResponse.body;
      var games = body && body.content && body.content.games;
      var gameObjects = [];

      if ( !games ) {
        return null;
      }

      foreach(games, function (game) {
        gameObjects.push( Archives.Client.Game(game) );
      });

      return gameObjects;
    }());
 
    return that;
  };

  Archives.Client.Query = function (args) {
    var that = {
      user: args.user,
      year: args.year,
      month: args.month,
      baseUrl: args.baseUrl || ''
    };

    that.getUrl = function () {
      return this.baseUrl+'/api/archives/'+this.user+'/'+this.year+'/'+this.month;
    };

    that.getHtmlUrl = function () {
      return this.baseUrl+'/users/'+this.user+'/games/'+this.year+'/'+this.month;
    };

    return that;
  };

  Archives.Client.User = function (args) {
    var that = {
      name: args.name,
      rank: args.rank,
      baseUrl: args.baseUrl || ''
    };

    that.hasRank = function () {
      return this.rank && this.rank !== '-' ? true : false;
    };

    that.getHtmlUrl = function () {
      return this.baseUrl + '/users/' + this.name;
    };

    return that;
  };

  Archives.Client.Game = function (args) {
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
        players.push( Archives.Client.User(arg) );
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

  Archives.HTTP = function (args) {
    var spec = args || {};
    var that = {};

    that.get = function (uri, callback) {
      var request = Archives.HTTP.Request({
        method: 'GET',
        uri: uri
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

      xhr.open( this.method, this.uri );

      xhr.onreadystatechange = function () {
        if ( this.readyState === 4 ) {
          callback(Archives.HTTP.Response({
            request: that,
            xhr: this
          }));
        }
      };

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
      //baseUrl: 'http://metakgs.org'
    });

    archives.start();
    console.log(archives);
  });

}());

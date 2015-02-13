(function() {
  'use strict';

  /*
   * Relations between components:
   *
   *   Archives
   *     isa Archives.Component
   *     has Archives.Error
   *     has Archives.Calendar
   *     has Archives.Result
   *     has Archives.YearList
   *     has Archives.Source
   *
   *   Archives.Error
   *     isa Archives.Component
   *
   *   Archives.Calendar
   *     isa Archives.Component
   *     has Archives.Calendar.DateList
   *
   *   Archives.Calendar.DateList
   *     isa Archives.Component
   *     has Archives.Calendar.DateList.Item
   *              
   *   Archives.Calendar.DateList.Item
   *     isa Archives.Component
   *
   *   Archives.Result
   *     isa Archives.Component
   *     has Archives.Result.GameList
   *
   *   Archives.Result.GameList
   *     isa Archives.Component
   *     has Archives.Result.GameList.Item
   *
   *   Archives.Result.GameList.Item
   *     isa Archives.Component
   *
   *   Archives.MonthIndex
   *     isa Archives.Component
   *     has Archives.MonthIndex.YearList
   *
   *   Archives.MonthIndex.YearList
   *     isa Archives.Component
   *     has Archives.MonthIndex.YearList.Item
   *
   *   Archives.MonthIndex.YearList.Item
   *     isa Archives.Component
   *     has Archives.MonthIndex.YearList.Item.MonthList
   *
   *   Archives.MonthIndex.YearList.Item.MonthList
   *     isa Archives.Component
   *     has Archives.MonthIndex.YearList.Item.MonthList.Item
   *
   *   Archives.MonthIndex.YearList.Item.MonthList.Item
   *     isa Archives.Component
   *
   *   Archives.Source
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

  function ucfirst (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function isNumber (value) {
    return typeof value === 'number' && isFinite(value);
  }

  function isInteger (value) {
    return isNumber(value) && Math.floor(value) === value;
  }

  function isString (value) {
    return typeof value === 'string';
  }

  var Archives = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.query = null;
    that.games = null;

    that.client = Archives.Client({
      baseUrl: spec.baseUrl,
      onError: function (error) {
        that.handleError( error );
      }
    });

    that.query = spec.query && that.client.buildQuery(spec.query);

    that.error = Archives.Error({
      context: that.find('error')
    });

    that.calendar = Archives.Calendar({
      context: that.find('calendar')
    });

    that.result = Archives.Result({
      context: that.find('result')
    });

    that.monthIndex = Archives.MonthIndex({
      context: that.find('monthindex')
    });

    that.source = Archives.Source({
      context: that.find('source')
    });

    that.call = function (args) {
      try {
        var that = this;
        var query = (args && args.query) || this.query;

        if ( !query ) {
          query = this.client.buildQuery({
            user  : this.getData('user'),
            year  : this.getData('year'),
            month : this.getData('month')
          });
        }

        this.render({ loading: true });

        this.client.get(query, function (response) {
          var status = response.getStatus();

          if ( status === 200 ) {
            that.render({
              query: response.query,
              games: response.games,
              result: {
                games: response.games,
                query: response.query,
                range: {
                  year: response.query.year,
                  month: response.query.month
                }
              },
              calendar: {
                query: response.query,
                games: response.games,
                link: response.link
              },
              monthIndex: {
                query: response.query,
                queries: response.queries
              },
              source: {
                url: response.body.request_url,
                date: new Date( response.body.requested_at )
              }
            });
          }
          else if ( status === 202 ) {
            that.render({
              error: {
                name: 'Accepted',
                message: 'Your request has been accepted for processing, ' +
                         'but the processing has not been completed yet. ' +
                         'Retry after one hour.'
              }
            });
          }
          else if ( status === 404 ) {
            that.render({
              error: {
                name: 'Not Found',
                message: 'The requested user "'+query.user+'" was not found.'
              }
            });
          }
          else {
            throw new Error("Don't know how to handle '"+code+"'");
          }
        });
      }
      catch (error) {
        this.handleError( error );
      }
    };

    that.handleError = function (error) {
      var name = error.name;

      if ( name === 'TimeoutError' ) {
        this.render({
          error: {
            name: 'Timeout',
            message: 'Request timed out.'
          }
        });
      }
      else {
        this.render({
          error: {
            message: 'Oops! Something went wrong.'
          }
        });
      }

      if ( console && console.log ) {
        console.log( error );
      }

      return;
    };

    that.render = function (args) {
      var games = args.games;
      var error = args.error;
      var query = args.query;

      if ( args.loading === true ) {
        this.find('if-isloading').show();
        return;
      }

      this.error.render( error );

      if ( error ) {
        this.calendar.hide();
        this.result.hide();
        this.monthIndex.hide();
        this.source.hide();
        this.find('if-isloading').hide();
        return;
      }

      this.unbind();

      this.calendar.render( args.calendar );
      this.result.render( args.result );
      this.monthIndex.render( args.monthIndex );
      this.source.render( args.source );

      this.find('if-isloading').hide();

      this.query = query;
      this.games = games;

      this.bind();

      return;
    };

    that.bind = function () {
      var that = this;
      var query = this.query;
      var games = this.games;
      var calendar = this.calendar;
      var result = this.result;
      var click = this.eventNameFor('click');

      calendar.find('show-allgames').on(click, function () {
        result.render({
          query: query,
          games: games,
          range: {
            year: query.year,
            month: query.month
          }
        });
      });

      calendar.dateList.eachItem(function (item) {
        if ( item.query.month === query.month ) {
          item.find('show-games').on(click, function () {
            result.render({
              query: item.query,
              games: item.games,
              range: {
                //year: item.year,
                //month: item.month,
                //day: item.day
                year: item.date.year,
                month: item.date.month,
                day: item.date.day
              }
            });
          });
        }
      });

      return;
    };

    that.unbind = function () {
      var calendar = this.calendar;
      var click = this.eventNameFor('click');

      calendar.find('show-allgames').off( click );

      calendar.dateList.eachItem(function (item) {
        item.find('show-games').off( click );
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
    that.link = null;

    that.dateList = Archives.Calendar.DateList({
      context: that.find('datelist')
    });

    that.render = function (args) {
      var that = this;
      var link = args ? args.link : this.link;
      var query = args ? args.query : this.query;
      var games = args ? args.games : this.games;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('year').setText( query.year );
      this.find('month').setText( FULLMON_LIST[query.month-1] );

      foreach(['first', 'prev', 'next', 'last'], function (rel) {
        if ( link[rel] ) {
          that.find( rel ).setDisabled( false );
          that.find( rel+'-link' ).setAttr( 'href', link[rel].getHtmlUrl() );
        }
        else {
          that.find( rel ).setDisabled( true );
        }
      });
 
      this.dateList.render({
        query: query,
        games: games
      });

      this.query = query;
      this.games = games;
      this.link = link;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.dateList.clear();

      this.query = null;
      this.games = null;
      this.link = null;

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

      this.find('show-allgames').on(click, function () {
        that.dateList.eachItem(function (item) {
          item.setActive( false );
        });
      });

      return;
    };

    that.unbind = function () {
      var click = this.eventNameFor( 'click' );

      this.find('show-allgames').off( click );

      return;
    };

    return that;
  };

  Archives.Calendar.DateList = function (args) {
    var spec = args || {};
    var that = Archives.List( spec );

    that.query = spec.query;
    that.games = spec.games;

    that.buildItem = function (args) {
      return Archives.Calendar.DateList.Item( args );
    };

    that.buildItems = function (args) {
      var that = this;
      var games = args.games || [];
      var query = args.query;
      var year = query.year;
      var month = query.month;

      var prevYear = month === 1 ? year - 1 : year;
      var prevMonth = month === 1 ? 12 : month - 1;
      var nextYear = month === 12 ? year + 1 : year;
      var nextMonth = month === 12 ? 1 : month + 1;

      var prevMonthLast = new Date( year, month-1, 0 );
      var first = new Date( year, month-1, 1 );
      var last = new Date( year, month, 0 );

      var items = [];
      var gamesOf = [null];
      var itemObjects = [];

      var day;

      for (
        day = prevMonthLast.getDate() - first.getDay() + 1;
        day <= prevMonthLast.getDate();
        day += 1
      ) {
        items.push({
          date: {
            year: prevYear,
            month: prevMonth,
            day: day
          },
          query: query
        });
      }

      for ( day = 1; day <= last.getDate(); day++ ) {
        items.push({
          date: {
            year: year,
            month: month,
            day: day
          },
          query: query,
          games: gamesOf[day] = []
        });
      }

      for ( day = 1; day <= 6-last.getDay(); day++ ) {
        items.push({
          date: {
            year: nextYear,
            month: nextMonth,
            day: day
          },
          query: query
        });
      }

      foreach(games, function (game) {
        gamesOf[ game.date.getUTCDate() ].push( game );
      });

      foreach(items, function (item) {
        itemObjects.push( that.buildItemWithDefaults(item) );
      });

      return itemObjects;
    };

    that.render = function (args) {
      var that = this;
      var query = args ? args.query : this.query;
      var games = args ? args.games : this.games;

      var items = query && this.buildItems({
        query: query,
        games: games
      });

      if ( args === null || !items ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();
      this.clearItems();

      foreach(items, function (item) {
        item.render();
        that.addItem( item );
      });

      this.query = query;
      this.games = games;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();
      this.clearItems();

      this.query = null;
      this.games = null;

      return;
    };

    that.bind = function () {
      var that = this;
      var query = this.query;
      var click = this.eventNameFor('click');
 
      this.eachItem(function (item) {
        if ( item.date.month === query.month ) {
          item.on(click, function () {
            that.eachItem(function (i) { i.setActive(false); });
            item.setActive( true );
          });
        }
      });

      return;
    };

    that.unbind = function () {
      var click = this.eventNameFor('click');

      this.eachItem(function (item) {
        item.off( click );
      });

      return;
    };

    return that;
  };

  Archives.Calendar.DateList.Item = function (args) {
    var spec = args || {};
    var that = Archives.List.Item( spec );

    that.date = spec.date;
    that.query = spec.query;
    that.games = spec.games;

    that.render = function (args) {
      var that = this;
      var date = args ? args.date : this.date;
      var query = args ? args.query : this.query;
      var games = (args ? args.games : this.games) || [];

      var gamesCount = {
        games  : games.length,
        wins   : 0,
        losses : 0,
        draws  : 0
      };

      if ( args === null || !date || !query ) {
        this.clear();
        return;
      }
 
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

      this.hide();
      this.unbind();

      this.setDisabled( date.month !== query.month );
      this.find('day').setText( date.day );

      foreach(Object.keys(gamesCount), function (key) {
        var item = that.find( key );

        if ( gamesCount[key] ) {
          item.find('count').setText( gamesCount[key] );
          item.show();
        }
        else {
          item.hide();
        }
      });

      this.date = date;
      this.query = query;
      this.games = games;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.date = null;
      this.query = null;
      this.games = null;

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

  Archives.Result = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.range = null;
    that.games = null;
    that.query = null;

    that.page = Archives.Page({
      entriesPerPage: that.getData('perpage'),
      totalEntries: (that.games || []).length
    });

    that.gameList = Archives.Result.GameList({
      context: that.find('gamelist')
    });

    that.sortByWhite = function (args) {
      return this.sortByPlayer( 'white', args );
    };

    that.sortByBlack = function (args) {
      return this.sortByPlayer( 'black', args );
    };

    that.sortByPlayer = function (role, args) {
      var make = function (arg) {
        var dir = arg === 'desc' ? -1 : 1;

        return function (a, b) {
          var names = [ '', '' ];

          foreach([a[role], b[role]], function (players, i) {
            foreach(players, function (player) {
              names[i] += (player.name.toLowerCase()+'         ').slice(0, 10);
            });
          });

          if ( names[0] && !names[1] ) {
            return -dir;
          }
          else if ( !names[0] && names[1] ) {
            return dir;
          }
          else if ( names[0] === names[1] ) {
            return a.date - b.date;
          }

          return names[0] > names[1] ? dir : -dir;
        };
      };
 
      return this.sort(args, {
        asc  : make('asc'),
        desc : make('desc')
      });
    };

    that.sortBySetup = function (args) {
      return this.sort(args, {
        asc: function (a, b) {
          return (a.boardSize - b.boardSize) || (a.handicap - b.handicap) || (a.date - b.date);
        },
        desc: function (a, b) {
          return (b.boardSize - a.boardSize) || (b.handicap - a.handicap) || (a.date - b.date);
        }
      });
    };

    that.sortByType = function (args) {
      return this.sort(args, {
        asc: function (a, b) {
          return a.type === b.type ? a.date - b.date : (a.type > b.type ? 1 : -1);
        },
        desc: function (a, b) {
          return a.type === b.type ? a.date - b.date : (b.type > a.type ? 1 : -1);
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

          if ( a.result === 'Unfinished' ) {
            return dir;
          }
          else if ( b.result === 'Unfinished' ) {
            return -dir;
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
      var that = this;
      var toggle = (args && args.toggle === true) || false;
      var games = this.games.slice(0).sort(callback.asc);
      var isSorted = true;
      var i;

      if ( toggle ) {
        foreach(games, function (game, i) {
          if ( game.date - that.games[i].date !== 0 ) {
            isSorted = false;
            return false;
          }
        });
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
      var range = (args && args.range) || this.range;
      var games = (args && args.games) || this.games;
      var query = (args && args.query) ? args.query : this.query;
      var page = args && args.page;

      var dateRange = FULLMON_LIST[range.month-1];
          dateRange += range.day ? ' '+range.day+', ' : ' ';
          dateRange += range.year;

      var pageObject = Archives.Page({
        entriesPerPage: this.page.entriesPerPage,
        totalEntries: games.length,
        currentPage: (args && args.games) ? 1 : (page || this.page.currentPage)
      });

      this.hide();
      this.unbind();

      this.gameList.render({
        games: pageObject.slice(games)
      });

      this.find('show-prevpage').setDisabled( !pageObject.getPreviousPage() );
      this.find('show-nextpage').setDisabled( !pageObject.getNextPage() );

      this.find('daterange').setText( dateRange );
      this.find('page-range').setText( pageObject.toString() );

      if ( games.length ) {
        this.find('if-hasgames').show();
      }
      else {
        this.find('if-hasgames').hide();
      }

      this.range = range;
      this.games = games;
      this.query = query;
      this.page = pageObject;
 
      this.bind();
      this.show();

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor('click');

      this.find('show-prevpage').on(click, function () {
        that.render({ page: that.page.getPreviousPage() });
      });

      this.find('show-nextpage').on(click, function () {
        that.render({ page: that.page.getNextPage() });
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

      this.find('sort-bytype').on(click, function () {
        that.sortByType({ toggle: true }).render({ page: 1 });
      });
 
      this.find('sort-bywhite').on(click, function () {
        that.sortByWhite({ toggle: true }).render({ page: 1 });
      });

      this.find('sort-byblack').on(click, function () {
        that.sortByBlack({ toggle: true }).render({ page: 1 });
      });
 
      return;
    };

    that.unbind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

      this.find('show-prevpage').off( click );
      this.find('show-nextpage').off( click );

      this.find('sort-bydate').off( click );
      this.find('sort-bysetup').off( click );
      this.find('sort-byresult').off( click );
      this.find('sort-bytype').off( click );
      this.find('sort-bywhite').off( click );
      this.find('sort-byblack').off( click );

      return;
    };
      
    return that;
  };

  Archives.Result.GameList = function (args) {
    var spec = args || {};
    var that = Archives.List( spec );

    that.games = spec.games;

    that.buildItem = function (args) {
      return Archives.Result.GameList.Item( args );
    };

    that.buildItems = function (args) {
      var that = this;
      var games = args.games;
      var items = [];

      foreach(games, function (game) {
        items.push(that.buildItemWithDefaults({
          game: game
        }));
      });

      return items;
    };

    that.render = function (args) {
      var that = this;
      var games = args ? args.games : this.games;

      var items = games && this.buildItems({
        games: games
      });

      if ( args === null || !items ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();
      this.clearItems();

      foreach(items, function (item) {
        item.render();
        that.addItem( item );
      });

      this.games = games;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();
      this.clearItems();

      this.games = null;

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

  Archives.Result.GameList.Item = function (args) {
    var spec = args || {};
    var that = Archives.List.Item( spec );

    that.game = spec.game;
    that.white = [];
    that.black = [];

    that.buildPlayers = function (role, args) {
      var that = this;
      var users = args || [];
      var players = [];

      foreach([0, 1], function (i) {
        players.push(Archives.Result.GameList.Player({
          context: that.find( role+(i+1) ),
          user: users[i]
        }));
      });

      return players;
    };

    that.eachPlayer = function (callback) {
      foreach( [].concat(this.white, this.black), callback );
    };

    that.render = function (args) {
      var game = args ? args.game : this.game;
      var white = game && this.buildPlayers( 'white', game.white );
      var black = game && this.buildPlayers( 'black', game.black );
      var dateFormat = this.find('date').getData('format') || '%c';

      if ( args === null || !game ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      if ( game.isPrivate() ) {
        this.find('link').setDisabled( true );
      }
      else {
        this.find('link').setAttr( 'href', game.getHtmlUrl() );
        this.find('link').setDisabled( false );
      }

      this.find('type').setText( game.type );
      this.find('shorttype').setText( game.getShortType() );
      this.find('typeinitial').setText( game.getTypeInitial() );

      this.find('setup').setText( game.getSetup() );
      this.find('boardsize').setText( game.boardSize );
      this.find('handicap').setText( game.handicap || '' );

      this.find('result').setText( game.result );

      this.find('date').setText( game.date.utcStrftime(dateFormat) );

      foreach([].concat(white, black), function (player) {
        player.render();
      });

      this.game = game;
      this.white = white;
      this.black = black;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.game = null;
      this.white = [];
      this.black = [];

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

  Archives.Result.GameList.Player = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.user = spec.user;

    that.render = function (args) {
      var user = args ? args.user : this.user;

      this.unbind();

      if ( user ) {
        this.find('link').setAttr( 'href', user.getHtmlUrl() );
        this.find('name').setText( user.name );
        this.find('rank').setText( user.hasRank() ? user.rank : '' );
        this.show();
      }
      else {
        this.hide();
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

    that.name = spec.name;
    that.message = spec.message;

    that.render = function (args) {
      var name = args ? args.name : this.name;
      var message = args ? args.message : this.message;

      this.unbind();

      if ( message ) {
        this.find('name').setText( name );
        this.find('message').setText( message );
        this.show();
      }
      else {
        this.hide();
      }

      this.name = name;
      this.message = message;

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

  Archives.MonthIndex = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.yearList = Archives.MonthIndex.YearList({
      context: that.find( 'yearlist' )
    });

    that.render = function (args) {
      this.bind();
      this.yearList.render(args);
      this.unbind();
    };

    that.bind = function () {
      // nothing to bind
    };

    that.unbind = function () {
      // nothing to unbind
    };

    return that;
  };

  Archives.MonthIndex.YearList = function (args) {
    var spec = args || {};
    var that = Archives.List( spec );

    that.query = spec.query;
    that.queries = spec.queries;

    that.buildItem = function (args) {
      return Archives.MonthIndex.YearList.Item( args );
    };

    that.buildItems = function (args) {
      var queries = args.queries;
      var start = queries[0];
      var end = queries[queries.length-1];
      var queriesOf = {};
      var items = [];
      var year;

      foreach(queries, function (query) {
        queriesOf[query.year] = queriesOf[query.year] || new Array(12);
        queriesOf[query.year][query.month-1] = query;
      });

      for ( year = start.year; year <= end.year; year++ ) {
        items.push(this.buildItemWithDefaults({
          queries: queriesOf[year],
          year: year
        }));
      }

      return items;
    };

    that.render = function (args) {
      var that = this;
      var query = args ? args.query : this.query;
      var queries = args ? args.queries : this.queries;

      var items = this.buildItems({
        queries: queries
      });

      this.unbind();
      this.clearItems();

      foreach(items, function (yearListItem) {
        var isSameYear = yearListItem.year === query.year;

        yearListItem.render();

        yearListItem.monthList.eachItem(function (monthListItem) {
          var isSameMonth = monthListItem.month === query.month;
          monthListItem.setActive( isSameYear && isSameMonth );
        });

        that.addItem( yearListItem );
      });

      this.queries = queries;
      this.query = query;

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

  Archives.MonthIndex.YearList.Item = function (args) {
    var spec = args || {};
    var that = Archives.List.Item( spec );

    that.year = spec.year;
    that.queries = spec.queries;

    that.monthList = Archives.MonthIndex.YearList.Item.MonthList({
      context: that.find('monthlist'),
      queries: spec.queries,
      month: spec.month
    });

    that.render = function (args) {
      var year = args ? args.year : this.year;
      var queries = args ? args.queries : this.queries;

      this.unbind();

      this.find('year').setText( year );

      this.monthList.render({
        queries: queries
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

  Archives.MonthIndex.YearList.Item.MonthList = function (args) {
    var spec = args || {};
    var that = Archives.List( spec );

    that.queries = spec.queries;

    that.buildItem = function (args) {
      return Archives.MonthIndex.YearList.Item.MonthList.Item( args );
    };

    that.buildItems = function (args) {
      var that = this;
      var queries = args.queries;
      var items = [];

      foreach(queries, function (query, month) {
        items.push(that.buildItemWithDefaults({
          month: month + 1,
          query: query
        }));
      });

      return items;
    };

    that.render = function (args) {
      var that = this;
      var queries = args ? args.queries : this.queries;

      var items = this.buildItems({
        queries: queries
      });

      this.unbind();
      this.clearItems();

      foreach(items, function (item) {
        item.render();
        that.addItem( item );
      });

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

  Archives.MonthIndex.YearList.Item.MonthList.Item = function (args) {
    var spec = args || {};
    var that = Archives.List.Item( spec );

    that.query = spec.query;
    that.month = spec.month;

    that.render = function (args) {
      var query = args ? args.query : this.query;
      var month = args ? args.month : this.month;

      this.unbind();

      this.find('mon').setText( month );
      this.find('monname').setText( MON_LIST[month-1] );
      this.find('fullmonname').setText( FULLMON_LIST[month-1] );

      if ( query ) {
        this.find('link').setAttr( 'href', query.getHtmlUrl() );
        this.setDisabled( false );
      }
      else {
        this.setDisabled( true );
      }

      this.query = query;
      this.month = month;

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

  Archives.Source = function (args) {
    var spec = args || {};
    var that = Archives.Component( args );

    that.url = spec.url;
    that.date = spec.date;
    that.dateFormat = spec.dateFormat || that.find('date').getData('format') || '%c';

    that.render = function (args) {
      var url = args ? args.url : this.url;
      var date = args ? args.date : this.date;
      var dateFormat = (args && args.dateFormat) || this.dateFormat;

      this.unbind();

      this.find('link').setAttr( 'href', url );
      this.find('url').setText( url );
      this.find('date').setText( date.strftime(dateFormat) );

      this.url = url;
      this.date = date;
      this.dateFormat = dateFormat;

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
    var that = spec.context ? Object.create(spec.context) : Archives.Element(spec);

    that.render = function (args) {
      throw Archives.NotImplementedError("call to abstract method 'render'");
    };

    that.clear = function () {
      throw Archives.NotImplementedError("call to abstract method 'clear'");
    };

    return that;
  };

  Archives.Element = function (args) {
    var spec = args || {};

    var that = {
      $context       : spec.$context       || $(),
      className      : spec.className      || '',
      eventNamespace : spec.eventNamespace || 'metakgsArchives',
      activeClass    : spec.activeClass    || '+active',
      disabledClass  : spec.disabledClass  || '+disabled',
      hideClass      : spec.hideClass      || '+hide'
    };

    that.classNameFor = function (name) {
      var className = name.replace(/^\+/, '');
      var prefix = this.className ? this.className+'-' : '';
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

    that.find = function (name) {
      var element = Object.create( this );

      element.$context = this.$context.find( '.'+this.classNameFor(name) );
      element.className = this.classNameFor( name );
      element.eventNamespace = this.eventNamespaceFor( name );

      return element;
    };

    that.find = function (name) {
      return Archives.Element({
        $context       : this.$context.find( '.'+this.classNameFor(name) ),
        className      : this.classNameFor( name ),
        eventNamespace : this.eventNamespaceFor( name ),
        activeClass    : this.activeClass,
        disabledClass  : this.disabledClass,
        hideClass      : this.hideClass
      });
    };

    return that;
  };

  Archives.List = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

    that.items = [];

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
      throw Archives.NotImplementedError("call to abstract method 'buildItem'");
    };

    that.buildItemWithDefaults = function (args) {
      //var context = this.find('item');
      //    context.$context = this.$itemTemplate.clone();

      var withDefaults = {
        $context       : this.$itemTemplate.clone(),
        className      : this.classNameFor('item'),
        eventNamespace : this.eventNamespaceFor('item'),
        activeClass    : this.activeClass,
        disabledClass  : this.disabledClass,
        hideClass      : this.hideClass
      };

      for ( var key in args ) {
        if ( args.hasOwnProperty(key) ) {
          withDefaults[key] = args[key];
        }
      }

      return this.buildItem( withDefaults );
    };

    that.eachItem = function (callback) {
      foreach( this.items, callback );
    };

    that.clearItems = function () {
      this.eachItem(function (item) { item.$context.remove(); });
      this.items.length = 0;
    };

    that.addItem = function (item) {
      this.$context.append( item.$context );
      this.items.push( item );
    };

    return that;
  };

  Archives.List.Item = function (args) {
    var spec = args || {};
    var that = Archives.Component( spec );

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
      onError: spec.onError || function (error) { throw error; }
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
      var onError = this.onError;

      $.ajax({
        type: 'GET',
        url: query.getUrl()
      }).
      done(function (data, textStatus, jqXHR) {
        try {
          callback(Archives.Client.Response({
            query: query,
            body: data,
            xhr: jqXHR,
            client: that
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
              throw Archives.TimoutError('Request timed out');
            }
            else if ( textStatus === 'abort' ) {
              throw Archives.ConnectionFailed('Request aborted');
            }
            else {
              throw Archives.ConnectionFailed('Failed to GET '+this.url);
            }
          }
          else {
            callback(Archives.Client.Response({
              query: query,
              xhr: jqXHR,
              client: that
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

  Archives.Client.Query = function (args) {
    var spec = args || {};

    foreach(['user', 'year', 'month'], function (key) {
      if ( !spec.hasOwnProperty(key) ) {
        throw Archives.ArgumentError("'"+key+"' is required");
      }
    });

    if ( !isString(spec.user) || !spec.user.match(/^[a-z][a-z0-9]{0,9}$/i) ) {
      throw Archives.ArgumentError("'user' is invalid");
    }

    if ( !isInteger(spec.year) || spec.year < 2000 ) {
      throw Archives.ArgumentError("'year' is invalid");
    }

    if ( !isInteger(spec.month) || spec.month < 1 || spec.month > 12 ) {
      throw Archives.ArgumentError("'month' is invalid");
    }

    var that = {
      user: spec.user,
      year: spec.year,
      month: spec.month,
      baseUrl: spec.baseUrl || ''
    };

    that.getUrl = function () {
      return this.baseUrl+'/api/archives/'+this.user+'/'+this.year+'/'+this.month;
    };

    that.getHtmlUrl = function () {
      return this.baseUrl+'/users/'+this.user+'/games/'+this.year+'/'+this.month;
    };

    return that;
  };

  Archives.Client.Response = function (args) {
    var spec = args || {};

    var that = {
      xhr: spec.xhr,
      body: spec.body,
      client: spec.client,
      query: spec.query
    };

    that.queries = (function () {
      var client = that.client;
      var start = ((that.body && that.body.queries) || [])[0];
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
      var games = that.body && that.body.content.games;
      var gameObjects = [];

      if ( !games ) {
        return null;
      }

      foreach(games, function (game) {
        gameObjects.push(Archives.Client.Game({
          baseUrl: that.client.baseUrl,
          game: game
        }));
      });

      return gameObjects;
    }());

    that.getStatus = function () {
      return this.xhr.status;
    };
 
    that.headerGet = function (field) {
      return this.xhr.getResponseHeader( field );
    };

    that.headerToString = function () {
      return this.xhr.getAllResponseHeaders();
    };

    that.getDate = function () {
      var date = this.headerGet('Date');
      return date && new Date(date);
    };

    that.getRetryAfter = function () {
      var retryAfter = that.headerGet('Retry-After');
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

    return that;
  };

  Archives.Client.User = function (args) {
    var that = {
      name: args.user.name,
      rank: args.user.rank,
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
      sgfUrl    : args.game.sgf_url,
      boardSize : args.game.board_size,
      handicap  : args.game.handicap || 0,
      date      : new Date( args.game.started_at ),
      result    : args.game.result,
      baseUrl   : args.baseUrl
    };

    that.type = {
      'Review'       : 'Demonstration',
      'Rengo Review' : 'Demonstration',
      'Simul'        : 'Simultaneous'
    }[args.game.type] || args.game.type;

    foreach(['white', 'black'], function (role) {
      var players = [];

      foreach(args.game[role] || [], function (arg) {
        players.push(Archives.Client.User({
          baseUrl: that.baseUrl,
          user: arg
        }));
      });

      that[role] = players;
    });

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

    that.getHtmlUrl = function () {
      var path = this.sgfUrl.match(/(\/games\/.*)\.sgf$/)[1];
      return this.baseUrl + path;
    };

    that.getSetup = function () {
      var setup = this.boardSize + '\u00D7' + this.boardSize;
      setup += this.handicap ? ' H'+this.handicap : '';
      return setup;
    };

    that.date.utcStrftime = function (format) {
      var offset = this.getTimezoneOffset() * 60 * 1000;
      return (new Date(this.getTime() + offset)).strftime(format);
    };

    return that;
  };

  Archives.ArgumentError = function (message) {
    var that = new Error( message );
    that.name = 'ArgumentError';
    return that;
  };

  Archives.NotImplementedError = function (message) {
    var that = new Error( message );
    that.name = 'NotImplementedError';
    return that;
  };

  Archives.ParsingError = function (message) {
    var that = new Error( message );
    that.name = 'ParsingError';
    return that;
  };

  Archives.ConnectionFailed = function (message) {
    var that = new Error( message );
    that.name = 'ConnectionFailed';
    return that;
  };

  Archives.TimoutError = function (message) {
    var that = new Error( message );
    that.name = 'TimeoutError';
    return that;
  };

  MetaKGS.App.Archives = Archives;

  $(document).ready(function () {
    var app = MetaKGS.App.Archives({
      $context: $('.js-archives'),
      className: 'js-archives'
    });

    app.call();
    console.log(app);
  });

}());

(function () {
  'use strict';

  var foreach = MetaKGS.Util.foreach;

  var user = function (args) {
    var spec = args || {};
    var that = MetaKGS.app( spec );

    that.user = spec.user;

    that.client = MetaKGS.client.top100({
      baseUrl: that.getData('baseUrl')
    });

    that.call = function () {
      var that = this;
      var name = this.name || this.getData('name') || '';

      this.client.query({}, function (response) {
        var user = name && response.buildUser({
          user: {
            name: name
          }
        });

        if ( response.getStatus() === 200 ) {
          foreach(response.content.players, function (player) {
            if ( player.name.toLowerCase() === name.toLowerCase() ) {
              user = player;
              return false;
            }
          });
        }

        that.render({
          user: user
        });
      });
    };

    that.render = function (args) {
      var that = this;
      var user = args ? args.user : this.user;

      if ( args === null || !user ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      if ( user.position && user.position <= 100 ) {
        this.find('if-istop100').show();
      }
      else {
        this.find('if-istop100').hide();
      }

      this.find('name').setText( user.name );
      this.find('rank').setText( user.rank || '' );
      this.find('position').setText( user.position || '' );
      
      this.user = user;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.user = null;

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

  MetaKGS.app.user = user;

}());

(function() {
  'use strict';

  /*
   * Relations between components:
   *
   *   archives
   *     isa MetaKGS.app
   *     has archives.error
   *     has archives.calendar
   *     has archives.result
   *     has archives.resources
   *     has archives.monthIndex
   *     has archives.source
   *
   *   archives.error
   *     isa MetaKGS.component
   *
   *   archives.calendar
   *     isa MetaKGS.component
   *     has archives.calendar.dateList
   *
   *   archives.calendar.dateList
   *     isa MetaKGS.component.list
   *     has archives.calendar.dateList.item
   *              
   *   archives.calendar.dateList.item
   *     isa MetaKGS.component.list.item
   *
   *   archives.result
   *     isa MetaKGS.component
   *     has archives.result.gameList
   *
   *   archives.result.gameList
   *     isa MetaKGS.component.list
   *     has archives.result.gameList.item
   *
   *   archives.result.gameList.item
   *     isa MetaKGS.component.list.item
   *
   *   archives.resources
   *     isa MetaKGS.component
   *
   *   archives.monthIndex
   *     isa MetaKGS.component
   *     has archives.monthIndex.yearList
   *
   *   archives.monthIndex.yearList
   *     isa MetaKGS.component.list
   *     has archives.monthIndex.yearList.item
   *
   *   archives.monthIndex.yearList.item
   *     isa MetaKGS.component.list.item
   *     has archives.monthIndex.yearList.item.monthList
   *
   *   archives.monthIndex.yearList.item.monthList
   *     isa MetaKGS.component.list
   *     has archives.monthIndex.yearList.item.monthList.item
   *
   *   archives.monthIndex.yearList.item.monthList.item
   *     isa MetaKGS.component.list.item
   *
   *   archives.source
   *     isa MetaKGS.component
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

  var foreach = MetaKGS.Util.foreach;
  var commify = MetaKGS.Util.commify;

  function utcStrftime (date, format) {
    var offset = date.getTimezoneOffset() * 60 * 1000;
    return (new Date(date.getTime() + offset)).strftime(format);
  }

  var archives = function (args) {
    var spec = args || {};
    var that = MetaKGS.app( spec );

    that.client = MetaKGS.client.archives({
      baseUrl: spec.baseUrl || that.getData('baseUrl'),
      onError: function (error) {
        that.handleError( error );
      }
    });

    that.query = spec.query || {
      user  : that.getData('user'),
      year  : that.getData('year'),
      month : that.getData('month')
    };

    that.error = archives.error({
      context: that.find('error')
    });

    that.calendar = archives.calendar({
      context: that.find('calendar')
    });

    that.result = archives.result({
      context: that.find('result')
    });

    that.resources = archives.resources({
      context: that.find('resources')
    });

    that.monthIndex = archives.monthIndex({
      context: that.find('monthindex')
    });

    that.source = archives.source({
      context: that.find('source')
    });

    that.call = function () {
      try {
        var that = this;

        this.render({ loading: true });

        this.client.query(this.query, function (response) {
          var status = response.getStatus();

          if ( status === 200 ) {
            that.render({
              calendar: {
                query: response.query,
                link: response.link,
                games: response.content.games
              },
              result: {
                query: response.query,
                range: {
                  year: response.query.year,
                  month: response.query.month
                },
                games: response.content.games
              },
              resources: {
                zipUrl: response.content.zipUrl,
                tgzUrl: response.content.tgzUrl
              },
              monthIndex: {
                query: response.query,
                queries: response.queries
              },
              source: {
                url: response.source.url,
                date: response.source.responseDate
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
            throw MetaKGS.Error("Don't know how to handle '"+code+"'");
          }
        });
      }
      catch (error) {
        this.handleError( error );
      }
    };

    that.handleError = function (error) {
      var name = error.name;

      if ( name === 'MetaKGSTimeoutError' ) {
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
      var that = this;

      var loading = args && (args.loading === true);

      var error      = (args && args.error)      || null;
      var calendar   = (args && args.calendar)   || null;
      var result     = (args && args.result)     || null;
      var resources  = (args && args.resources)  || null;
      var monthIndex = (args && args.monthIndex) || null;
      var source     = (args && args.source)     || null;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      if ( loading ) {
        this.find('if-isloading').show();
      }
      else {
        this.find('if-isloading').hide();
      }

      this.error.render( error );
      this.calendar.render( calendar );
      this.result.render( result );
      this.resources.render( resources );
      this.monthIndex.render( monthIndex );
      this.source.render( source );

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.error.clear();
      this.calendar.clear();
      this.result.clear();
      this.resources.clear();
      this.monthIndex.clear();
      this.source.clear();

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor('click');

      this.calendar.find('show-allgames').on(click, function () {
        if ( that.calendar.query ) {
          that.result.render({
            query: that.calendar.query,
            games: that.calendar.games,
            range: {
              year: that.calendar.query.year,
              month: that.calendar.query.month
            }
          });
        }
      });

      this.calendar.dateList.eachItem(function (item) {
        if ( item.hasGames() ) {
          item.find('show-games').on(click, function () {
            that.result.render({
              query: item.query,
              games: item.games,
              range: {
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
      var click = this.eventNameFor('click');

      this.calendar.find('show-allgames').off( click );

      this.calendar.dateList.eachItem(function (item) {
        item.find('show-games').off( click );
      });

      return;
    };

    return that;
  };

  archives.calendar = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.query = spec.query;
    that.games = spec.games;
    that.link = spec.link;

    that.dateList = archives.calendar.dateList({
      context: that.find('datelist')
    });

    that.render = function (args) {
      var that = this;
      var link = args ? args.link : this.link;
      var query = args ? args.query : this.query;
      var games = args ? args.games : this.games;

      if ( args === null || !query ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('year').setText( query.year );
      this.find('month').setText( FULLMON_LIST[query.month-1] );

      if ( link ) {
        foreach(['first', 'prev', 'next', 'last'], function (rel) {
          if ( link[rel] ) {
            that.find( rel ).setDisabled( false );
            that.find( rel+'-link' ).setAttr( 'href', link[rel].toHtmlUrl() );
          }
          else {
            that.find( rel ).setDisabled( true );
          }
        });
      }
 
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
      var click = this.eventNameFor('click');

      this.find('show-allgames').on(click, function () {
        that.dateList.eachItem(function (item) {
          item.setActive( false );
        });
      });

      return;
    };

    that.unbind = function () {
      var click = this.eventNameFor('click');

      this.find('show-allgames').off( click );

      return;
    };

    return that;
  };

  archives.calendar.dateList = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list( spec );

    that.itemBuilder = spec.itemBuilder || archives.calendar.dateList.item;
    that.query = spec.query;
    that.games = spec.games;

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
        itemObjects.push( that.buildItem(item) );
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
      var click = this.eventNameFor('click');
 
      this.eachItem(function (item) {
        if ( item.hasGames() ) {
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

  archives.calendar.dateList.item = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list.item( spec );

    that.date = spec.date;
    that.query = spec.query;
    that.games = spec.games;

    that.hasGames = function () {
      return (this.games && this.games.length) ? true : false;
    };

    that.render = function (args) {
      var that = this;
      var date = args ? args.date : this.date;
      var query = args ? args.query : this.query;
      var games = args ? args.games : this.games;

      var gamesCount = {
        games  : games ? games.length : 0,
        wins   : 0,
        losses : 0,
        draws  : 0
      };

      if ( args === null || !date || !query ) {
        this.clear();
        return;
      }
 
      foreach(games || [], function (game) {
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

  archives.result = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.query = spec.query;
    that.range = spec.range;
    that.games = spec.games;

    that.page = archives.page({
      entriesPerPage: that.getData('perpage'),
      totalEntries: (that.games || []).length
    });

    that.gameList = archives.result.gameList({
      context: that.find('gamelist')
    });

    that.render = function (args) {
      var that = this;
      var range = args ? args.range : this.range;
      var games = args ? args.games : this.games;
      var query = args ? args.query : this.query;
      var dateRange;

      if ( args === null || !games || !games.length ) {
        this.clear();
        return;
      }

      this.page.totalEntries = games ? games.length : 0;
      this.page.currentPage  = args ? (args.page || 1) : this.page.currentPage;

      dateRange = FULLMON_LIST[range.month-1];
      dateRange += range.day ? ' '+range.day+', ' : ' ';
      dateRange += range.year;

      this.hide();
      this.unbind();

      this.gameList.render({
        games: this.page.slice(games)
      });

      this.find('show-prevpage').setDisabled( !this.page.getPreviousPage() );
      this.find('show-nextpage').setDisabled( !this.page.getNextPage() );

      this.find('daterange').setText( dateRange );
      this.find('page-range').setText( this.page.toString() );

      if ( this.page.getLastPage() > 1 ) {
        this.find('if-haspages').show();
      }
      else {
        this.find('if-haspages').hide();
      }

      this.query = query;
      this.range = range;
      this.games = games;
 
      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.page.totalEntries = 0;
      this.page.currentPage  = 1;

      this.gameList.clear();

      this.query = null;
      this.range = null;
      this.games = null;

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor('click');

      this.find('show-prevpage').on(click, function () {
        if ( that.page.getPreviousPage() ) {
          that.page.currentPage -= 1;
          that.render();
        }
      });

      this.find('show-nextpage').on(click, function () {
        if ( that.page.getNextPage() ) {
          that.page.currentPage += 1;
          that.render();
        }
      });

      this.find('sort-bytype').on(click, function () {
        that.sortByType({ toggle: true }).render();
      });
 
      this.find('sort-bywhite').on(click, function () {
        that.sortByWhite({ toggle: true }).render();
      });

      this.find('sort-byblack').on(click, function () {
        that.sortByBlack({ toggle: true }).render();
      });
 
      this.find('sort-bysetup').on(click, function () {
        that.sortBySetup({ toggle: true }).render();
      });

      this.find('sort-byresult').on(click, function () {
        that.sortByResult({ toggle: true }).render();
      });

      this.find('sort-bydate').on(click, function () {
        that.sortByDate({ toggle: true }).render();
      });

      return;
    };

    that.unbind = function () {
      var that = this;
      var click = this.eventNameFor('click');

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
      var games = this.games && this.games.slice(0);
      var isSorted = true;

      if ( games ) {
        games.sort( callback.asc );
      }
      else {
        return this;
      }

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

      this.page.currentPage = 1;
      this.games = games;

      return this;
    };

    return that;
  };

  archives.result.gameList = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list( spec );

    that.games = spec.games;
    that.itemBuilder = spec.itemBuilder || archives.result.gameList.item;

    that.buildItems = function (args) {
      var that = this;
      var games = args.games;
      var items = [];

      foreach(games, function (game) {
        items.push(that.buildItem({
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

  archives.result.gameList.item = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list.item( spec );

    that.game = spec.game;
    that.white = [];
    that.black = [];

    that.buildPlayers = function (role, args) {
      var that = this;
      var users = args || [];
      var players = [];

      foreach([0, 1], function (i) {
        players.push(archives.result.gameList.player({
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

      this.find('date').setText( utcStrftime(game.date, dateFormat) );

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

  archives.result.gameList.player = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.user = spec.user;

    that.render = function (args) {
      var user = args ? args.user : this.user;

      this.hide();
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
      this.show();

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

  archives.error = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.name = spec.name;
    that.message = spec.message;

    that.render = function (args) {
      var that = this;
      var name = args ? args.name : this.name;
      var message = args ? args.message : this.message;

      if ( args === null || !message ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('name').setText( name || '' );
      this.find('message').setText( message );

      this.name = name;
      this.message = message;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.name = null;
      this.message = null;

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

  archives.resources = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.zipUrl = spec.zipUrl;
    that.tgzUrl = spec.tgzUrl;

    that.render = function (args) {
      var that = this;
      var zipUrl = args ? args.zipUrl : this.zipUrl;
      var tgzUrl = args ? args.tgzUrl : this.tgzUrl;

      if ( args === null || (!zipUrl && !tgzUrl) ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      if ( zipUrl ) {
        this.find('if-haszip').show();
        this.find('zip-link').setAttr( 'href', zipUrl );
      }
      else {
        this.find('if-haszip').hide();
      }

      if ( tgzUrl ) {
        this.find('if-hastgz').show();
        this.find('tgz-link').setAttr( 'href', tgzUrl );
      }
      else {
        this.find('if-hastgz').hide();
      }

      this.zipUrl = zipUrl;
      this.tgzUrl = tgzUrl;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.zipUrl = null;
      this.tgzUrl = null;

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

  archives.monthIndex = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( spec );

    that.yearList = archives.monthIndex.yearList({
      context: that.find( 'yearlist' )
    });

    that.render = function (args) {
      var that = this;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.yearList.render( args );

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.yearList.clear();

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

  archives.monthIndex.yearList = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list( spec );

    that.itemBuilder = spec.itemBuilder || archives.monthIndex.yearList.item;
    that.query = spec.query;
    that.queries = spec.queries;

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
        items.push(this.buildItem({
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

      var items = queries && this.buildItems({
        queries: queries
      });

      if ( args === null || !items ) {
        this.clear();
        return;
      }

      this.hide();
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
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();
      this.clearItems();

      this.query = null;
      this.queries = null;

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

  archives.monthIndex.yearList.item = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list.item( spec );

    that.year = spec.year;
    that.queries = spec.queries;

    that.monthList = archives.monthIndex.yearList.item.monthList({
      context: that.find('monthlist'),
      queries: spec.queries,
      month: spec.month
    });

    that.render = function (args) {
      var that = this;
      var year = args ? args.year : this.year;
      var queries = args ? args.queries : this.queries;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('year').setText( year );

      this.monthList.render({
        queries: queries
      });

      this.year = year;
      this.queries = queries;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.monthList.clear();

      this.year = null;
      this.queries = null;

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

  archives.monthIndex.yearList.item.monthList = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list( spec );

    that.itemBuilder = spec.itemBuilder || archives.monthIndex.yearList.item.monthList.item;
    that.queries = spec.queries;

    that.buildItems = function (args) {
      var that = this;
      var queries = args.queries;
      var items = [];

      foreach(queries, function (query, month) {
        items.push(that.buildItem({
          month: month + 1,
          query: query
        }));
      });

      return items;
    };

    that.render = function (args) {
      var that = this;
      var queries = args ? args.queries : this.queries;

      var items = queries && this.buildItems({
        queries: queries
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

      this.queries = queries;

      this.bind();
      this.show();
      
      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();
      this.clearItems();

      this.queries = null;

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

  archives.monthIndex.yearList.item.monthList.item = function (args) {
    var spec = args || {};
    var that = MetaKGS.component.list.item( spec );

    that.query = spec.query;
    that.month = spec.month;

    that.render = function (args) {
      var that = this;
      var query = args ? args.query : this.query;
      var month = args ? args.month : this.month;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('mon').setText( month );
      this.find('monname').setText( MON_LIST[month-1] );
      this.find('fullmonname').setText( FULLMON_LIST[month-1] );

      if ( query ) {
        this.find('link').setAttr( 'href', query.toHtmlUrl() );
        this.setDisabled( false );
      }
      else {
        this.setDisabled( true );
      }

      this.query = query;
      this.month = month;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.query = null;
      this.month = null;

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

  archives.source = function (args) {
    var spec = args || {};
    var that = MetaKGS.component( args );

    that.url = spec.url;
    that.date = spec.date;
    that.dateFormat = spec.dateFormat || that.find('date').getData('format') || '%c';

    that.render = function (args) {
      var that = this;
      var url = args ? args.url : this.url;
      var date = args ? args.date : this.date;
      var dateFormat = (args && args.dateFormat) || this.dateFormat;

      if ( args === null ) {
        this.clear();
        return;
      }

      this.hide();
      this.unbind();

      this.find('link').setAttr( 'href', url );
      this.find('url').setText( url );
      this.find('date').setText( date.strftime(dateFormat) );

      this.url = url;
      this.date = date;
      this.dateFormat = dateFormat;

      this.bind();
      this.show();

      return;
    };

    that.clear = function () {
      var that = this;

      this.hide();
      this.unbind();

      this.url = null;
      this.date = null;

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

  // ported from Data::Page on CPAN

  archives.page = function (args) {
    var spec = args || {};

    var that = {
      totalEntries   : spec.totalEntries   || 0,
      entriesPerPage : spec.entriesPerPage || 10,
      currentPage    : spec.currentPage    || 1
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

  MetaKGS.app.archives = archives;

}());


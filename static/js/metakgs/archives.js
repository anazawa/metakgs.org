(function() {
  'use strict';

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

  var archives = function (args) {
    var spec = args || {};
    var that = MetaKGS.App.archives.component( spec );

    that.user = spec.user || that.$context.data('user');
    that.year = spec.year || that.$context.data('year');
    that.month = spec.month || that.$context.data('month');

    that.gameList = archives.gameList({
      classNamePrefix: that.classNameFor('gamelist') + '-',
      $context: that.find('gamelist')
    });

    that.calendar = archives.calendar({
      classNamePrefix: that.classNameFor('calendar') + '-',
      $context: that.find('calendar')
    });

    that.start = function (args) {
      var that = this;
      var query = args || {};
      var user = query.user || this.user;
      var year = query.year || this.year;
      var month = query.month || this.month;
      var url = 'http://metakgs.org/api/archives/'+user+'/'+year+'/'+month;

      $.getJSON(url, function (response) {
        var games = [];

        foreach(response.content.games, function (game) {
          games.push( archives.game(game) );
        });

        that.render({
          games: games,
          user: user,
          year: year,
          month: month
        });

        that.bind();
      });
    };

    that.render = function (args) {
      var that = this;
      var user = args.user;
      var year = args.year;
      var month = args.month;
      var day = args.games;
      var games = args.games;

      this.find('year').text( year );
      this.find('month').text( FULLMON_LIST[month-1] );

      this.calendar.render({
        user  : user,
        year  : year,
        month : month,
        games : games
      });

      this.gameList.render({
        year: year,
        month: month,
        games: games
      });

      this.user = user;
      this.year = year;
      this.month = month;
      this.games = games;

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

      this.calendar.eachDate(function (date) {
        date.find('show-games').on(click, function () {
          that.gameList.render({
            year: date.year,
            month: date.month,
            day: date.day,
            games: date.games
          });
        });
      });

      this.find('show-allgames').on(click, function () {
        that.gameList.render({
          year: that.year,
          month: that.month,
          games: that.games
        });
      });

      this.calendar.bind();
      this.gameList.bind();

      return;
    };

    return that;
  };

  archives.calendar = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

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
        dateObjects.push(archives.calendar.date({
          $context        : $template.clone(),
          classNamePrefix : classNamePrefix,
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

  archives.calendar.date = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

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

  archives.gameList = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

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
      var items = [];

      foreach(games, function (game) {
        items.push(archives.gameList.item({
          classNamePrefix: classNamePrefix,
          $context: $template.clone(),
          game: game
        }));
      });

      return items;
    };

    that.items = that.buildItems( spec.games );

    that.page = archives.page({
      entriesPerPage: that.$context.data('perpage'),
      totalEntries: that.items.length
    });

    that.eachItem = function (callback) {
      foreach( this.items, callback );
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
          return a.game.boardSize - b.game.boardSize
              || a.game.handicap  - b.game.handicap
              || a.game.date      - b.game.date;
        },
        desc: function (a, b) {
          return b.game.boardSize - a.game.boardSize
              || b.game.handicap  - a.game.handicap
              || a.game.date      - b.game.date;
        }
      });
    };

    that.sortByResult = function (args) {
      var getScore = /^([BW])\+(\d+\.\d+)$/;

      var make = function (arg) {
        var dir = arg === 'desc' ? -1 : 1;

        return function (a, b) {
          var aScore = getScore.exec( a.game.result );
          var bScore = getScore.exec( b.game.result );

          if ( a.game.result === b.game.result ) {
            return a.game.date - b.game.date;
          }

          if ( aScore && bScore && aScore[1] === bScore[1] ) {
            return dir * (parseFloat(aScore[2]) - parseFloat(bScore[2]));
          }

          return a.game.result > b.game.result ? dir : -dir;
        };
      };
 
      return this.sort(args, {
        asc  : make('asc'),
        desc : make('desc')
      });
    };

    that.sortByDate = function (args) {
      return this.sort(args, {
        asc: function (a, b) {
          return a.game.date - b.game.date;
        }
      });
    };

    that.sort = function (args, callback) {
      var toggle = args && args.toggle === true || false;
      var items = this.items.slice(0).sort(callback.asc);
      var isSorted = true;
      var i;

      if ( toggle ) {
        for ( i = 0; i < items.length; i++ ) {
          if ( items[i].game.date - this.items[i].game.date !== 0 ) {
            isSorted = false;
            break;
          }
        }
        if ( isSorted && callback.desc ) {
          items.sort( callback.desc );
        }
        else if ( isSorted ) {
          items.reverse();
        }
      }

      this.items = items;

      return this;
    };

    that.render = function (args) {
      var that = this;
      var games = args && args.games;
      var page = args && args.page;
      var year = games ? args.year : this.year;
      var month = games ? args.month : this.month;
      var day = games ? args.day : this.day;
      var items = games ? this.buildItems(games) : this.items;
      var $list = this.$list;

      var pageObject = archives.page({
        entriesPerPage: this.page.entriesPerPage,
        totalEntries: items.length,
        currentPage: games ? 1 : (page || this.page.currentPage)
      });

      var dateRange = FULLMON_LIST[month-1];
          dateRange += day ? ' ' + day + ', ' : ' ';
          dateRange += year;

      var pageRange = pageObject.getFirst() + '-' + pageObject.getLast();

      var totalGames = MetaKGS.Util.commify( ''+items.length );

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

      this.find('totalgames').text( totalGames );
      this.find('daterange').text( dateRange );
      this.find('page-range').text( pageRange );

      // XXX
      if ( items.length ) {
        this.find('if-hasgames').show();
      }
      else {
        this.find('if-hasgames').hide();
      }

      foreach(pageObject.slice(items), function (item) {
        var $item = item.$context;

        item.render();

        if ( item.game.isPrivate() ) {
          $item.addClass( item.classNameFor('private') );
        }

        $list.append( $item );
      });

      this.page = pageObject;
      this.items = items;
      this.year = year;
      this.month = month;
      this.day = day;

      return;
    };

    that.bind = function () {
      var that = this;
      var click = this.eventNameFor( 'click' );

      var $sortByDate   = this.find( 'sortby-date' );
      var $sortBySetup  = this.find( 'sortby-setup' );
      var $sortByResult = this.find( 'sortby-result' );
      var $showPrevPage = this.find( 'show-prevpage' );
      var $showNextPage = this.find( 'show-nextpage' );

      this.eachItem(function (item) {
        item.bind();
      });

      $sortByDate.off( click );
      $sortBySetup.off( click );
      $sortByResult.off( click );

      $showPrevPage.off( click );
      $showNextPage.off( click );

      this.find('sortby-date').on(click, function () {
        that.sortByDate({ toggle: true }).render({ page: 1 });
      });

      this.find('sortby-setup').on(click, function () {
        that.sortBySetup({ toggle: true }).render({ page: 1 });
      });

      this.find('sortby-result').on(click, function () {
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

    return that;
  };

  archives.gameList.item = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

    that.game = spec.game;

    that.buildPlayers = function (role, args) {
      var that = this;
      var users = args || [];
      var players = [];

      foreach([0, 1], function (i) {
        var user = users[i];
        var className = role + (i + 1);

        players.push(archives.gameList.player({
          classNamePrefix: that.classNameFor(className) + '-',
          $context: that.find( className ),
          user: user
        }));
      });

      return players;
    };

    that.white = spec.game && that.buildPlayers('white', spec.game.white);
    that.black = spec.game && that.buildPlayers('black', spec.game.black);

    that.render = function (args) {
      var that = this;
      var game = args || this.game;

      var type = game.getTypeInitial();

      var setup = game.boardSize + 'x' + game.boardSize;
          setup += game.handicap ? ' H'+game.handicap : '';

      var result = game.result;

      var date = MON_LIST[ game.date.getUTCMonth() ];
          date += ' ' + game.date.getUTCDate();
          date += " '" + (''+game.date.getUTCFullYear()).slice(-2);
          date += ' at ' + ('0'+game.date.getUTCHours()).slice(-2);
          date += ':' + ('0'+game.date.getUTCMinutes()).slice(-2);

      this.find('type').text( type );
      this.find('setup').text( setup );
      this.find('result').text( result );
      this.find('date').text( date );

      this.renderWhite( game.white );
      this.renderBlack( game.black );

      this.$context.show();

      this.game = game;

      return;
    };

    that.renderWhite = function (args) {
      this.renderPlayers( 'white', args );
    };

    that.renderBlack = function (args) {
      this.renderPlayers( 'black', args );
    };

    that.renderPlayers = function (role, args) {
      var players = args ? this.buildPlayers(role, args) : this[role];

      foreach(players, function (player) {
        player.render();
      });

      this[role] = players;
 
      return;
    };

    that.bind = function () {
      var players = [].concat( this.white, this.black );

      foreach(players, function (player) {
        player.bind();
      });

      return;
    };

    return that;
  };

  archives.gameList.player = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

    that.user = spec.user;

    that.render = function (arg) {
      var user = arg || this.user;
      var $name = this.find( 'name' );
      var $rank = this.find( 'rank' );

      if ( user ) {
        $name.text( user.name );
        $name.attr( 'href', user.getHtmlUrl() );
        $rank.text( user.hasRank() ? user.rank : '' );
      }
      else {
        this.$context.hide();
      }

      this.user = user;

      return;
    };

    that.bind = function () {
      // nothing to bind
    };

    return that;
  };

  archives.component = function (args) {
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
      return this.eventNamespace ? name+'.'+this.eventNamespace : name;
    };

    that.render = function () {
      throw new Error("call to abstract method 'render'");
    };

    that.bind = function () {
      throw new Error("call to abstract method 'bind'");
    };

    return that;
  };

  archives.user = function (args) {
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

  archives.game = function (args) {
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
        players.push( archives.user(arg) );
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

  archives.page = function (args) {
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

    return that;
  };

  MetaKGS.App.archives = archives;

  $(document).ready(function () {
    var archives = MetaKGS.App.archives({
      $context: $('.js-archives'),
      classNamePrefix: 'js-archives-',
    });

    archives.start();
  });

}());

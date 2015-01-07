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
    var that = archives.component( spec );

    that.user = spec.user || that.$context.data('user');
    that.year = spec.year || that.$context.data('year');
    that.month = spec.month || that.$context.data('month');

    that.apiEndpoint = spec.apiEndpoint || '/api';
    that.http = archives.http();

    that.gameList = archives.gameList({
      classNamePrefix: that.classNameFor('gamelist') + '-',
      eventNamespace: that.eventNamespace + 'GameList',
      $context: that.find( 'gamelist' )
    });

    that.calendar = archives.calendar({
      classNamePrefix: that.classNameFor('calendar') + '-',
      eventNamespace: that.eventNamespace + 'Calendar',
      $context: that.find( 'calendar' )
    });

    that.error = archives.error({
      classNamePrefix: that.classNameFor('error') + '-',
      eventNamespace: that.eventNamespace + 'Error',
      $context: that.find( 'error' )
    });

    that.start = function () {
      var user = this.user;
      var year = this.year;
      var month = this.month;
      var url = this.uriFor( 'archives/'+user+'/'+year+'/'+month );

      this.get( url );
    };

    that.uriFor = function (path) {
      return this.apiEndpoint + '/' + path.replace(/^\//, '');
    };

    that.get = function (url) {
      var that = this;

      this.render({ loading: true });

      this.http.get(url, function (response) {
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
      var query = this.guessQuery( response );
      var content = response.body.content;
      var games = [];

      foreach(content.games, function (game) {
        games.push( archives.game(game) );
      });

      this.render({
        user  : query.user,
        year  : query.year,
        month : query.month,
        games : games
      });

      this.bind({
        link : response.body.link
      });

      return;
    };

    that.guessQuery = function (response) {
      var uri = response.request.uri;
      var query = uri.match(/\/([a-zA-Z][a-zA-Z0-9]{0,9})\/(\d{4})\/(\d\d?)$/);

      return query && {
        user  : query[1],
        year  : parseInt( query[2], 10 ),
        month : parseInt( query[3], 10 )
      };
    };

    that.render = function (args) {
      var that = this;
      var user = args.user;
      var year = args.year;
      var month = args.month;
      var day = args.games;
      var games = args.games;
      var link = args.link;
      var error = args.error;

      if ( args.loading ) {
        this.find('if-isloading').show();
        return;
      }
      else {
        this.find('if-isloading').hide();
      }

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

      this.error.render( error );

      this.user = user;
      this.year = year;
      this.month = month;
      this.games = games;

      return;
    };

    that.bind = function (args) {
      var that = this;
      var link = args.link;
      var calendar = this.calendar;
      var click = this.eventNameFor( 'click' );

      this.calendar.eachDate(function (date) {
        date.find('show-games').off(click).on(click, function () {
          that.gameList.render({
            year: date.year,
            month: date.month,
            day: date.day,
            games: date.games
          });
        });
      });

      calendar.find('show-allgames').off(click).on(click, function () {
        that.gameList.render({
          year: that.year,
          month: that.month,
          games: that.games
        });
      });

      calendar.find('show-prevmonth').off(click).on(click, function () {
        that.get( link.prev );
      });

      calendar.find('show-nextmonth').off(click).on(click, function () {
        that.get( link.next );
      });

      this.calendar.bind();
      this.gameList.bind();
      this.error.bind();

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
        dateObjects.push(archives.calendar.date({
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

    that.year = spec.year;
    that.month = spec.month;
    that.day = null;
    that.games = spec.games;
    that.items = null;

    that.page = archives.page({
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
        items.push(archives.gameList.item({
          classNamePrefix: classNamePrefix,
          eventNamespace: eventNamespace,
          $context: $template.clone(),
          game: game
        }));
      });

      return items;
    };

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
      var toggle = args && args.toggle === true || false;
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
      var year = (args && args.games) ? args.year : this.year;
      var month = (args && args.games) ? args.month : this.month;
      var day = (args && args.games) ? args.day : this.day;
      var $list = this.$list;

      var pageObject = archives.page({
        entriesPerPage: this.page.entriesPerPage,
        totalEntries: games.length,
        currentPage: (args && args.games) ? 1 : (page || this.page.currentPage)
      });

      var items = this.buildItems( pageObject.slice(games) );

      var dateRange = FULLMON_LIST[month-1];
          dateRange += day ? ' ' + day + ', ' : ' ';
          dateRange += year;

      var pageRange = pageObject.getFirst() + '-' + pageObject.getLast();

      var totalGames = MetaKGS.Util.commify( ''+games.length );

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
      if ( games.length ) {
        this.find('if-hasgames').show();
      }
      else {
        this.find('if-hasgames').hide();
      }

      foreach(items, function (item) {
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
      this.games = games;

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

      $sortByDate.on(click, function () {
        that.sortByDate({ toggle: true }).render({ page: 1 });
      });

      $sortBySetup.on(click, function () {
        that.sortBySetup({ toggle: true }).render({ page: 1 });
      });

      $sortByResult.on(click, function () {
        that.sortByResult({ toggle: true }).render({ page: 1 });
      });

      $showPrevPage.on(click, function () {
        that.render({ page: that.page.getPreviousPage() });
      });

      $showNextPage.on(click, function () {
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
          eventNamespace: that.eventNamespace + 'Player',
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

  archives.error = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

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

  archives.http = function (args) {
    var spec = args || {};
    var that = {};

    that.get = function (url, callback) {
      var request = archives.http.request({
        method: 'GET',
        uri: url
      });

      request.send( callback );

      return;
    };

    return that;
  };

  archives.http.request = function (args) {
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
          callback(archives.http.response({
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

  archives.http.response = function (args) {
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

    return that;
  };

  MetaKGS.App.archives = archives;

  $(document).ready(function () {
    var archives = MetaKGS.App.archives({
      classNamePrefix: 'js-archives-',
      $context: $('.js-archives'),
      apiEndpoint: 'http://metakgs.org/api'
    });

    archives.start();
    console.log(archives);
  });

}());

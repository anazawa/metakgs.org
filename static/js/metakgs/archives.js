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

    //that.games = MetaKGS.App.archives.games({
    //  $context: that.findByClassName('games'),
    //  classNamePrefix: that.classNamePrefix
    //});

    that.buildCalendar = function (args) {
      return MetaKGS.App.archives.calendar({
        $context: this.findByClassName('calendar'),
        classNamePrefix: this.classNameFor('calendar')+'-',
        year: args.year,
        month: args.month
      });
    };

    that.render = function (args) {
      var that = this;
      var query = args || {};
      var user = query.user || this.$context.data('user');
      var year = query.year || this.$context.data('year');
      var month = query.month || this.$context.data('month');
      var url = 'http://metakgs.org/api/archives/'+user+'/'+year+'/'+month;

      var calendar = this.buildCalendar({
        year: year,
        month: month
      });

      var gameList = MetaKGS.App.archives.gameList({
        classNamePrefix: this.classNameFor('gamelist')+'-',
        $context: this.findByClassName('gamelist')
      });

      $.getJSON(url, function (response) {
        that.findByClassName('year').text( year );
        that.findByClassName('month').text( FULLMON_LIST[month-1] );

        //calendar.draw({
        //  user: user,
        //  year: year,
        //  month: month,
        //  games: response.content.games
        //});

        //calendar.render();

        //calendar.eachDate(function (date) {
        //  if ( date.content && date.content.games ) {
        //    date.$context.on('click', function (event) {
        //      console.log('Day '+date.day);
        //    });
        //  }
        //});

        var games = [];
        MetaKGS.Util.foreach(response.content.games, function (game) {
          games.push( MetaKGS.App.archives.game(game) );
        });

        //that.games.render( response.content.games );
        //games.draw( response.content.games );
        //console.log(games);
        gameList.render( games );

        console.log(gameList);

        calendar.render({
          user: user,
          year: year,
          month: month,
          games: games
        });
        console.log(calendar);
      });
    };

    that.draw = function (args) {
      var calendar = args.calendar;
    };

    return that;
  };

  archives.component = function (args) {
    var spec = args || {};
 
    var that = {
      $context: spec.$context || $(),
      classNamePrefix: spec.classNamePrefix || ''
    };

    that.classNameFor = function (name) {
      return this.classNamePrefix + name;
    };

    that.findByClassName = function (name, $context) {
      var $c = $context || this.$context;
      return $c.find( '.'+this.classNameFor(name) );
    };

    that.render = function () {
      throw new Error("call to abstract method 'render'");
    };

    return that;
  };

  archives.game = function (args) {
    var that = {
      boardSize: args.board_size,
      handicap: args.handicap,
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

      var winners = ( this.result.match(/^(W|B)\+/) || [] )[1];
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

    return that;
  };

  archives.calendar = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

    that.year = spec.year;
    that.month = spec.month;
    that.dates = null;

    that.$dateTemplate = (function () {
      var $dateList = that.findByClassName( 'datelist' );
      var $template = that.findByClassName( 'date-template', $dateList );
      var $clone = $template.clone();

      $template.remove();

      $clone.removeClass( that.classNameFor('date-template') );
      $clone.addClass( that.classNameFor('date') );

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
      var $dateList = this.findByClassName( 'datelist' );

      var dates = this.buildDates({
        user  : user,
        year  : year,
        month : month,
        games : games
      });

      this.findByClassName( 'date', $dateList ).remove();

      foreach(dates, function (date) {
        var $date = date.$context;

        date.render();

        if ( date.year === that.year && date.month === that.month ) {
          $date.addClass( that.classNameFor('this-month') );
        }
        else if ( date.year > that.year || date.month > that.month ) {
          $date.addClass( that.classNameFor('next-month') );
        }
        else {
          $date.addClass( that.classNameFor('prev-month') );
        }
 
        $dateList.append( $date );
      });

      this.year = year;
      this.month = month;
      this.dates = dates;
      
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
      var $day = this.findByClassName( 'day' );

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

      $day.text( day );

      foreach(Object.keys(gamesCount), function (key) {
        var $item = that.findByClassName( key );
        var $itemCount = that.findByClassName( key+'-count', $item );

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

    return that;
  };

  archives.gameList = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

    that.$itemTemplate = (function () {
      var $template = that.findByClassName( 'item-template' );
      var $clone = $template.clone();

      $clone.removeClass( that.classNameFor('item-template') );
      $clone.addClass( that.classNameFor('item') );

      $template.remove();

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

    that.eachItem = function (callback) {
      foreach( this.items, callback );
    };

    that.render = function (games) {
      var $context = this.$context;
      var items = games ? this.buildItems(games) : this.items;

      this.findByClassName('item').remove();

      foreach(items, function (item) {
        item.render();
        $context.append( item.$context );
      });

      this.items = items;

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
          classNamePrefix: that.classNameFor(className)+'-',
          $context: that.findByClassName(className),
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

      var $type   = this.findByClassName( 'type' );
      var $setup  = this.findByClassName( 'setup' );
      var $result = this.findByClassName( 'result' );
      var $date   = this.findByClassName( 'date' );

      var type = game.getTypeInitial();

      var setup = game.boardSize + 'x' + game.boardSize;
          setup += game.handicap ? ' H'+game.handicap : '';

      var result = game.result;

      var date = MON_LIST[ game.date.getUTCMonth() ];
          date += ' ' + game.date.getUTCDate();
          date += " '" + (''+game.date.getUTCFullYear()).slice(-2);
          date += ' at ' + ('0'+game.date.getUTCHours()).slice(-2);
          date += ':' + ('0'+game.date.getUTCMinutes()).slice(-2);

      $type.text( type );
      $setup.text( setup );
      $result.text( result );
      $date.text( date );

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

    return that;
  };

  archives.gameList.player = function (args) {
    var spec = args || {};
    var that = archives.component( spec );

    that.user = spec.user;

    that.render = function (arg) {
      var user = arg || this.user;
      var $name = this.findByClassName( 'name' );
      var $rank = this.findByClassName( 'rank' );

      if ( user ) {
        $name.text( user.name );
        $rank.text( user.hasRank() ? user.rank : '' );
      }
      else {
        this.$context.hide();
      }

      this.user = user;

      return;
    };

    return that;
  };

  MetaKGS.App.archives = archives;

  $(document).ready(function () {
    var archives = MetaKGS.App.archives({
      $context: $('.js-archives'),
      classNamePrefix: 'js-',
    });

    archives.render();
  });

}());

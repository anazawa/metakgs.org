(function() {
  'use strict';

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

  MetaKGS.App.archives = function (args) {
    var spec = args || {};
    var that = MetaKGS.App.archives.component( spec );

    that.calendar = MetaKGS.App.archives.calendar({
      context: that.findByClassName('calendar'),
      classNamePrefix: that.classNameFor('calendar')+'-'
    });

    that.render = function (args) {
      var that = this;
      var query = args || {};
      var user = query.user || this.context.data('user');
      var year = query.year || this.context.data('year');
      var month = query.month || this.context.data('month');
      var url = 'http://metakgs.org/api/archives/'+user+'/'+year+'/'+month;

      $.getJSON(url, function (response) {
        that.findByClassName('year').text( year );
        that.findByClassName('month').text( FULLMON_LIST[month-1] );

        that.calendar.render({
          query: {
            user: user,
            year: year,
            month: month
          }, 
          response: response
        });
      });
    };

    return that;
  };

  MetaKGS.App.archives.component = function (args) {
    var spec = args || {};
 
    var that = {
      context: spec.context || $(),
      classNamePrefix: spec.classNamePrefix || ''
    };

    that.classNameFor = function (name) {
      return this.classNamePrefix + name;
    };

    that.findByClassName = function (name, context) {
      var c = context || this.context;
      return c.find( '.'+this.classNameFor(name) );
    };

    that.render = function () {
      throw new Error("call to abstract method 'render'");
    };

    return that;
  };

  MetaKGS.App.archives.calendar = function (args) {
    var spec = args || {};
    var that = MetaKGS.App.archives.component( spec );

    that.buildDayContents = function (args) {
      var query = args.query;
      var games = args.games;
      var lowerCase = query.user.toLowerCase();
      var lastDay = (new Date( query.year, query.month, 0 )).getDate();
      var i, contents = [];

      for ( i = 0; i < lastDay; i++ ) {
        contents.push({
          games: 0,
          wins: 0,
          losses: 0
        });
      }

      MetaKGS.Util.foreach(games, function (game) {
        var content = contents[ (new Date(game.started_at)).getDate()-1 ];
        var winner = ( game.result.match(/^(B|W)\+/) || [] )[1];
        var winners = winner && game[ winner === 'B' ? 'black' : 'white' ];

        content.games++;

        if ( !winners ) { return; }

        content.losses++;

        MetaKGS.Util.foreach(winners, function (winner) {
          if ( winner.name.toLowerCase() === lowerCase ) {
            content.losses--;
            content.wins++;
            return false;
          }
        });
      });

      return contents;
    };

    that.buildAreas = function (args) {
      var areas = [];
      var offset = (new Date( args.year, args.month-1, 1 )).getDay();
      var last = new Date( args.year, args.month, 0 );
      var days = that.findByClassName( 'day' );

      days.each(function (i) {
        if ( i >= offset && i < offset+last.getDate() ) {
          areas.push({
            //year: args.year,
            //month: args.month, 
            day: i-offset+1,
            content: args.dayContents[i-offset],
            element: $(this)
          });
        }
        else if ( i < offset+last.getDate()+(6-last.getDay()) ) {
          areas.push({
            //year: null,
            //month: null,
            day: null,
            content: null,
            element: $(this)
          });
        }
        else {
          return false;
        }
      });

      return areas;
    };

    that.draw = function (args) {
      var that = this;
      var areas = args.areas;
      var weeks = this.findByClassName( 'week' );

      weeks.each(function (i) {
        if ( i < areas.length/7 ) {
          $(this).show();
        }
        else {
          $(this).hide();
        }
      });

      MetaKGS.Util.foreach(areas, function (area) {
        var content = area.content;
        var dayNumber = that.findByClassName( 'day-number', area.element );
        var dayContent = that.findByClassName( 'day-content', area.element );

        if ( area.day ) {
          area.element.removeClass( that.classNameFor('day-disabled') );
          dayNumber.show();
          dayContent.show();
        }
        else {
          area.element.addClass( that.classNameFor('day-disabled') );
          dayNumber.hide();
          dayContent.hide();
          return;
        }

        dayNumber.text( area.day );

        MetaKGS.Util.foreach(['games', 'wins', 'losses'], function (key) {
          var item = that.findByClassName( key, dayContent );
          var itemCount = that.findByClassName( key+'-count', item );

          itemCount.text( content[key] );

          if ( content[key] ) {
            item.show();
          }
          else {
            item.hide();
          }
        });
      });
    };

    that.render = function (args) {
      var dayContents = this.buildDayContents({
        //year: args.query.year,
        //month: args.query.month,
        query: args.query,
        games: args.response.content.games
      });

      var areas = this.buildAreas({
        year: args.query.year,
        month: args.query.month,
        dayContents: dayContents
      });

      this.draw({
        year: args.query.year,
        month: args.query.month,
        areas: areas
      });
    };
      
    return that;
  };

  $(document).ready(function () {
    var archives = MetaKGS.App.archives({
      context: $('.js-archives'),
      classNamePrefix: 'js-',
    });

    archives.render();

    console.log(archives);
  });

}());

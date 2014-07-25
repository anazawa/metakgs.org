package MetaKGS::Web::Controller::API::GameArchives;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use HTTP::Date qw/time2str/;
use MetaKGS::FormValidator;
use MetaKGS::Model::Resources;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_DAY/;
use WWW::GoKGS::Scraper::GameArchives;

sub _scraper_class { 'WWW::GoKGS::Scraper::GameArchives' }

sub show {
    my ( $class, $c, $args ) = @_;
    my $now = gmtime;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            user
        )],
        optional => [qw(
            year
            month
        )],
        defaults => {
            year  => $now->year,
            month => $now->mon,
        },
        constraint_methods => {
            user  => sub { $_[1] =~ m/^[a-zA-Z][a-zA-Z0-9]{0,9}$/ },
            year  => sub { $_[1] =~ m/^[2-9]\d\d\d$/ },
            month => sub { $_[1] =~ m/^(?:[1-9]|1[012])$/ },
        },
    });

    my $uri = $class->_scraper_class->build_uri(
        user  => $query->{user},
        year  => $query->{year},
        month => $query->{month},
        oldAccounts => 'y',
    );

    my $resource
        = Resources
        ->uri_eq( $uri )
        ->order_by_request_date( 'DESC' )
        ->select
        ->next;

    if ( !$resource or $now > $class->_expires($resource) ) {
        $class->_create( $c, $uri );
    }
    else {
        $class->_show( $c, $resource );
    }
}

sub _show {
    my ( $class, $c, $resource ) = @_;
    my $expires = $class->_expires( $resource );

    my @headers = (
        'Last-Modified' => time2str( $resource->{response_date}->epoch ),
        #'Cache-Control' => time2str( $expires->epoch ),
        #'Expires'       => time2str( $expires->epoch ),
    );

    $c->render_json(
        $resource,
        status => $resource->{status_code},
        headers => \@headers,
        template => 'GameArchives#show',
    );
}

sub _expires {
    my ( $class, $resource ) = @_;
    my %query = $resource->{uri}->query_form;
    my $date = $resource->{request_date};

    my $start = Time::Piece->strptime(
        sprintf( '%04d-%02d', $query{year}, $query{month} ),
        '%Y-%m'
    );

    return $date + ONE_DAY if $date < $start->add_months(1) + ONE_DAY;
    return $start->add_months(2) if $date < $start->add_months(2);
    return $start->add_months(7) if $date < $start->add_months(7);

    gmtime->add_years( 1 );
}

sub _scrape {
    my ( $class, @args ) = @_;
    my $result = $class->SUPER::_scrape( @args );

    for my $game ( @{ $result->{games} || [] } ) {
        $game->{sgf_uri}    .= q{} if exists $game->{sgf_uri};
        $game->{board_size} += 0;
        $game->{handicap}   += 0 if exists $game->{handicap};

        for my $user (
            $game->{owner} || (),
            @{ $game->{black} || [] },
            @{ $game->{white} || [] },
        ) {
            $user->{uri} .= q{};
        }
    }

    $result->{tgz_uri} .= q{} if exists $result->{tgz_uri};
    $result->{zip_uri} .= q{} if exists $result->{zip_uri};

    for my $month ( @{ $result->{calendar} || [] } ) {
        $month->{year}  += 0;
        $month->{month} += 0;
        $month->{uri}   .= q{} if exists $month->{uri};
    }

    $result;
}

1;

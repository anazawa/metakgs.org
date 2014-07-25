package MetaKGS::Web::Controller::API::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use MetaKGS::Model::Resources;
use Time::Piece;
use Time::Seconds qw/ONE_DAY/;
use WWW::GoKGS::Scraper::TournList;

sub _scraper_class { 'WWW::GoKGS::Scraper::TournList' }

sub show {
    my ( $class, $c, $args ) = @_;
    my $now = gmtime;

    my $query = MetaKGS::FormValidator->validate($args, {
        optional => [qw(
            year
        )],
        defaults => {
            year => $now->year,
        },
        constraint_methods => {
            year => sub { $_[1] =~ /^\d\d\d\d$/ && $_[1] >= 2001 },
        },
    });

    my $uri = $class->_scraper_class->build_uri(
        year => $query->{year},
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

    $c->render_json(
        $resource,
        template => 'TournList#show',
    );
}

sub _scrape {
    my ( $class, @args ) = @_;
    my $result = $class->SUPER::_scrape( @args );

    for my $tournament ( @{ $result->{tournaments} || [] } ) {
        $tournament->{uri} .= q{};
    }

    for my $year ( @{ $result->{year_index} || [] } ) {
        $year->{year} += 0;
        $year->{uri}  .= q{} if exists $year->{uri};
    }

    $result;
}

sub _expires {
    my ( $class, $resource ) = @_;
    my %query = $resource->{uri}->query_form;
    my $date = $resource->{response_date};

    my $start = Time::Piece->strptime(
        sprintf( '%04d', $query{year} ),
        '%Y'
    );

    return $date + ONE_DAY if $date < $start->add_years(1);

    gmtime->add_years( 1 );
}

1;

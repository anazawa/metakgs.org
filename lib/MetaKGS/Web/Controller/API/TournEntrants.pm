package MetaKGS::Web::Controller::API::TournEntrants;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use MetaKGS::FormValidator;
use MetaKGS::Model::Resources;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_HOUR ONE_DAY/;
use WWW::GoKGS::Scraper::TournEntrants;

sub _scraper_class { 'WWW::GoKGS::Scraper::TournEntrants' }

sub show {
    my ( $class, $c, $args ) = @_;
    my $now = gmtime;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            id
        )],
        constraint_methods => {
            id => sub { $_[1] =~ /^[1-9]\d*$/ && $_[1] >= 1 },
        },
    });

    my $uri = $class->_scraper_class->build_uri(
        id   => $query->{id},
        sort => 'n',
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
        template => 'TournEntrants#show',
    );
}

sub _scrape {
    my ( $class, @args ) = @_;
    my $result = $class->SUPER::_scrape( @args );

    for my $entrant ( @{ $result->{entrants} || [] } ) {
        $entrant->{position} += 0 if exists $entrant->{position};
        $entrant->{score}    += 0 if exists $entrant->{score};
        $entrant->{sos}      += 0 if exists $entrant->{sos};
        $entrant->{sodos}    += 0 if exists $entrant->{sodos};
    }

    for my $round ( @{ $result->{links}->{rounds} || [] } ) {
        $round->{round} += 0;
        $round->{uri}   .= q{} if exists $round->{uri};
    }

    for my $entrants ( @{ $result->{links}->{entrants} || [] } ) {
        $entrants->{uri} .= q{};
    }

    $result;
}

sub _expires {
    my ( $class, $resource ) = @_;
    my $date = $resource->{response_date};

    my $end = $resource->{content}->{links}->{rounds}->[-1]->{end_time};
       $end = Time::Piece->strptime( $end, '%Y-%m-%dT%H:%M' ) if $end;

    return $date + ONE_HOUR unless $end;
    return $date + ONE_DAY if $date < $end + ONE_DAY;
    return $end->add_months(1) if $date < $end->add_months(1);
    return $end->add_months(2) if $date < $end->add_months(2);
    return $end->add_months(6) if $date < $end->add_months(6);

    gmtime->add_years( 1 );
}

1;

package MetaKGS::Web::Controller::API::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use HTTP::Status qw/HTTP_NOT_FOUND HTTP_INTERNAL_SERVER_ERROR/;
use MetaKGS::Web::View::JSON::TournList;
use MetaKGS::WWW::GoKGS::Scraper::TournList;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_HOUR ONE_DAY/;

sub scraper_class { 'MetaKGS::WWW::GoKGS::Scraper::TournList' }

sub template_class { 'MetaKGS::Web::View::JSON::TournList' }

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
            year => sub { $_[1] =~ /^[1-9]\d*$/ },
        },
    });

    $class->SUPER::show( $c, $query );
}

sub do_show {
    my ( $class, $c, $resource ) = @_;

    return $class->not_found( $c, $resource )
        if $resource->{status_code} == HTTP_NOT_FOUND;

    return $class->bad_gateway( $c )
        if $resource->{status_code} == HTTP_INTERNAL_SERVER_ERROR;

    $class->SUPER::do_show( $c, $resource );
}

sub expires {
    my ( $class, $resource ) = @_;
    my $code = $resource->{status_code};
    my %query = $resource->{request_uri}->query_form;
    my $date = $resource->{response_date} || $resource->{request_date};
    my $now = gmtime;
    my $never = $now->add_years( 1 );

    my $start = Time::Piece->strptime(
        sprintf( '%04d', $query{year} ),
        '%Y'
    );

    return $date + ONE_HOUR if $code == HTTP_INTERNAL_SERVER_ERROR;

    return $never     if $code == HTTP_NOT_FOUND and $start->year < 2001;
    return $start - 1 if $code == HTTP_NOT_FOUND and $start->year > $now->year;

    return $date + ONE_DAY if $date < $start->add_years(1);

    $never;
}

1;

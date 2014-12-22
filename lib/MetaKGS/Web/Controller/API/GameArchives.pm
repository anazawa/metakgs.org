package MetaKGS::Web::Controller::API::GameArchives;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use List::MoreUtils qw/none/;
use MetaKGS::FormValidator;
use MetaKGS::Web::View::JSON::GameArchives;
use MetaKGS::WWW::GoKGS::Scraper::GameArchives;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_DAY/;

sub scraper_class { 'MetaKGS::WWW::GoKGS::Scraper::GameArchives' }

sub template_class { 'MetaKGS::Web::View::JSON::GameArchives' }

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
        field_filters => {
            user => sub { lc shift },
        },
        constraint_methods => {
            user  => sub { $_[1] =~ m/^[a-z][a-z0-9]{0,9}$/ },
            year  => sub { $_[1] =~ m/^[2-9]\d\d\d$/ },
            month => sub { $_[1] =~ m/^(?:[1-9]|1[012])$/ },
        },
    });

    $query->{oldAccounts} = 'y';

    $class->SUPER::show( $c, $query );
}

sub do_show {
    my ( $class, $c, $resource ) = @_;
    my %query = $resource->{request_uri}->query_form;
    my $cal = $resource->{content}->{calendar};

    my $month = sprintf '%04d%02d', @query{qw/year month/};
    my $start = $cal && sprintf '%04d%02d', @{$cal->[0]}{qw/year month/};
    my $end   = gmtime->strftime( '%Y%m' );

    return $class->not_found( $c, $resource )
        if !$cal or $month < $start or $end < $month;

    $class->SUPER::do_show( $c, $resource );
}

sub expires {
    my ( $class, $resource ) = @_;
    my %query = $resource->{request_uri}->query_form;
    my $date = $resource->{response_date} || $resource->{request_date};

    my $start = Time::Piece->strptime(
        sprintf( '%04d-%02d', $query{year}, $query{month} ),
        '%Y-%m'
    );

    return $date + ONE_DAY if $date < $start->add_months(1) + ONE_DAY;
    return $start->add_months(2) if $date < $start->add_months(2);
    return $start->add_months(7) if $date < $start->add_months(7);

    gmtime->add_years( 1 );
}

1;

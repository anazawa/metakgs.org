package MetaKGS::Web::Controller::API::TournEntrants;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use HTTP::Status qw/HTTP_NOT_FOUND/;
use MetaKGS::FormValidator;
use MetaKGS::Web::View::JSON::TournEntrants;
use MetaKGS::WWW::GoKGS::Scraper::TournEntrants;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_HOUR ONE_DAY/;

sub scraper_class { 'MetaKGS::WWW::GoKGS::Scraper::TournEntrants' }

sub template_class { 'MetaKGS::Web::View::JSON::TournEntrants' }

sub show {
    my ( $class, $c, $args ) = @_;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            id
        )],
        constraint_methods => {
            id => sub { $_[1] =~ /^[1-9]\d*$/ },
        },
    });

    $query->{sort} = 's'; # score

    $class->SUPER::show( $c, $query );
}

sub do_show {
    my ( $class, $c, $resource ) = @_;

    return $class->not_found( $c, $resource )
        if $resource->{status_code} == HTTP_NOT_FOUND;

    $class->SUPER::do_show( $c, $resource );
}

sub expires {
    my ( $class, $resource ) = @_;
    my $date = $resource->{response_date} || $resource->{request_date};
    my $never = gmtime->add_years( 1 );

    return $date + ONE_DAY if $resource->{status_code} == HTTP_NOT_FOUND;

    my $end = $resource->{content}->{links}->{rounds}->[-1]->{end_time};
       $end = Time::Piece->strptime( $end, '%Y-%m-%dT%H:%M' ) if $end;

    return $date + ONE_HOUR unless $end;
    return $date + ONE_DAY if $date < $end + ONE_DAY;
    return $end->add_months(1) if $date < $end->add_months(1);
    return $end->add_months(2) if $date < $end->add_months(2);
    return $end->add_months(6) if $date < $end->add_months(6);

    $never;
}

1;

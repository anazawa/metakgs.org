package MetaKGS::Web::Controller::API::Top100;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::API/;
use MetaKGS::Web::View::JSON::Top100;
use MetaKGS::WWW::GoKGS::Scraper::Top100;
use Time::Seconds qw/ONE_DAY/;

sub scraper_class { 'MetaKGS::WWW::GoKGS::Scraper::Top100' }

sub template_class { 'MetaKGS::Web::View::JSON::Top100' }

sub expires {
    my ( $class, $resource ) = @_;
    my $date = $resource->{response_date} || $resource->{request_date};
    $date + ONE_DAY;
}

1;

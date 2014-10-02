package MetaKGS::TheSchwartz::Worker::Scraper;
use strict;
use warnings;
use parent qw/MetaKGS::TheSchwartz::Worker/;
use Encode qw/decode_utf8/;
use HTTP::Status qw/is_success/;
use MetaKGS::Model::Resources;
use MetaKGS::WWW::GoKGS::Scraper::GameArchives;
use MetaKGS::WWW::GoKGS::Scraper::Top100;
use MetaKGS::WWW::GoKGS::Scraper::TournList;
use MetaKGS::WWW::GoKGS::Scraper::TournInfo;
use MetaKGS::WWW::GoKGS::Scraper::TournEntrants;
use MetaKGS::WWW::GoKGS::Scraper::TournGames;
use Time::Piece qw/gmtime/;
use Time::Seconds qw/ONE_DAY/;
use URI;

sub max_retries { 7 }

sub retry_delay { ONE_DAY }

sub _scraper_classes {
    my $class = shift;

    qw(
        MetaKGS::WWW::GoKGS::Scraper::GameArchives
        MetaKGS::WWW::GoKGS::Scraper::Top100
        MetaKGS::WWW::GoKGS::Scraper::TournList
        MetaKGS::WWW::GoKGS::Scraper::TournInfo
        MetaKGS::WWW::GoKGS::Scraper::TournEntrants
        MetaKGS::WWW::GoKGS::Scraper::TournGames
    );
}

sub _scraper_class_for {
    my ( $class, $uri ) = @_;
    my $path = URI->new( $uri )->path;

    my $found;
    for my $scraper_class ( $class->_scraper_classes ) {
        next unless $path eq $scraper_class->build_uri->path;
        $found = $scraper_class;
        last;
    }
    
    $found;
}

sub _scrape {
    my ( $class, $html, $base_uri ) = @_;
    my $scraper_class = $class->_scraper_class_for( $base_uri );
    die "Don't know how to scrape '$base_uri'" unless $scraper_class;
    $scraper_class->new->scrape( $html, $base_uri );
}

sub work {
    my ( $class, $job ) = @_;
    my $arg = $job->arg;
    my $raw_content = decode_utf8 $arg->{raw_content};
    my $resource = Resources->request_id_eq( $arg->{request_id} );
    my $response_date = gmtime $arg->{response_date};

    my $content
        = is_success( $arg->{status_code} )
        ? $class->_scrape( \$raw_content, $arg->{request_uri} )
        : undef;

    $resource->update(
        status_code   => $arg->{status_code},
        response_date => $response_date,
        content       => $content,
    );

    $job->completed;

    return;
}

1;

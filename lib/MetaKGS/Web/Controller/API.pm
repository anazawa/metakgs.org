package MetaKGS::Web::Controller::API;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use Carp qw/croak/;
use HTML::TreeBuilder::LibXML;
use LWP::UserAgent;
use HTTP::Request;
use MetaKGS::Model::Resources;
use Time::Piece qw/gmtime/;

sub _show {
    croak 'call to abstract method ', __PACKAGE__, '::_show';
}

sub _scraper_class {
    croak 'call to abstract method ', __PACKAGE__, '::_scraper_class';
}

sub _scrape {
    my ( $class, @args ) = @_;

    my $scraper = $class->_scraper_class->new(
        _tree_builder_class => 'HTML::TreeBuilder::LibXML',
    );

    $scraper->scrape( @args );
}

sub _create {
    my ( $class, $c, $uri ) = @_;
    my $request_date = gmtime;

    my $user_agent = LWP::UserAgent->new(
        agent => 'MetaKGS',
        timeout => 30,
    );

    my $upstream = $uri->clone;
       $upstream->authority( $c->upstream->authority );

    my $request = HTTP::Request->new( 'GET', $upstream );
       $request->date( $request_date->epoch );

    my $response = $user_agent->simple_request( $request );
    my $client_warning = $response->header('Client-Warning') || q{};

    if ( $client_warning eq 'Internal response' ) {
        return $c->res_504 if $response->status_line =~ /read timeout/;
        die "GET $upstream failed: ", $response->status_line;
    }

    my $response_date = $response->date;
       $response_date = gmtime $response_date if $response_date;

    my $content = $response->is_success && $response->decoded_content;
       $content = $class->_scrape( \$content, $uri ) if $content;

    Resources->insert(
        uri           => $uri,
        request_date  => $request_date,
        status_code   => $response->code,
        response_date => $response_date,
        content       => $content,
    );

    my $resource
        = Resources
        ->uri_eq( $uri )
        ->request_date_eq( $request_date )
        ->select
        ->next;

    $class->_show( $c, $resource );
}

1;

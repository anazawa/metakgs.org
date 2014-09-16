package MetaKGS::Web::Controller::API;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use Carp qw/croak/;
use Digest::MD5 qw/md5_hex/;
use Encode qw/encode_utf8/;
use HTTP::Status qw/:constants/;
use Log::Minimal qw/warnf/;
use MetaKGS::HTTP::Request;
use MetaKGS::Model::Resources;
use MetaKGS::Teng::Constants qw/DESC NOT_APPLICABLE UNKNOWN/;
use Time::Piece qw/gmtime/;

sub scraper_class {
    croak 'call to abstract method ', __PACKAGE__, '::scraper_class';
}

sub scrape {
    my ( $class, @args ) = @_;
    $class->scraper_class->new->scrape( @args );
}

sub template_class {
    croak 'call to abstract method ', __PACKAGE__, '::template_class';
}

sub expires {
    croak 'call to abstract method ', __PACKAGE__, '::expires';
}

sub show {
    my ( $class, $c, $args ) = @_;
    my $uri = $class->scraper_class->build_uri( %$args );

    my $resource
        = Resources
        ->request_uri_eq( $uri )
        ->status_code_ne( NOT_APPLICABLE )
        ->order_by_request_date( DESC )
        ->select
        ->next;

    return $class->do_update( $c, $uri ) unless $resource;

    unless ( defined $resource->{status_code} ) {
        my ( $job ) = $c->the_schwartz->list_jobs({
            funcname => 'MetaKGS::TheSchwartz::Worker::Scraper',
            uniqkey  => $resource->{request_id},
        });

        return $class->accepted( $c, $job->as_hashref ) if $job;
        return $class->do_update( $c, $uri );
    }

    return $class->do_update( $c, $uri )
        if gmtime > $class->expires( $resource );

    $class->do_show( $c, $resource );
}

sub do_show {
    my ( $class, $c, $resource ) = @_;
    my $body = $class->template_class->show( $resource );
    my $response = $c->render_json( $body );

    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    # for cache validation
    $response->headers->last_modified( $resource->{response_date}->epoch );
    $response->header( 'ETag' => '"'.md5_hex($resource->{request_id}).'"' );

    # set cache expiration time
    $response->headers->expires( $class->expires($resource)->epoch );

    $response;
}

sub do_update {
    my ( $class, $c, $uri ) = @_;
    my $request_date = gmtime;

    my $upstream_uri = URI->new( $c->upstream_uri );

    $upstream_uri->path(do {
        my $path = $upstream_uri->path;
        $path =~ s{/$}{};
        $path . $uri->path;
    });

    $upstream_uri->query_form( $uri->query_form );

    my $request = MetaKGS::HTTP::Request->new( 'GET', $upstream_uri );
       $request->date( $request_date->epoch );

    my $resource = Resources->insert(
        request_id   => $request->id,
        request_uri  => $uri,
        request_date => $request_date,
    );

    my $response = $c->user_agent->simple_request( $request );

    my $error = do {
        my $client_warning = $response->header('Client-Warning') || q{};
        my $client_aborted = $response->header('Client-Aborted') || q{};

        if ( $client_warning eq 'Internal response' ) {
            $response->content || q{};
        }
        elsif ( $client_aborted eq 'die' ) {
            $response->header('X-Died') || q{};
        }
        else {
            undef;
        }
    };

    if ( defined $error ) {
        $resource->do_update(
            status_code   => NOT_APPLICABLE,
            response_date => NOT_APPLICABLE,
            content       => NOT_APPLICABLE,
        );

        warnf '%s %s failed: %s', $request->method, $request->uri, $error;

        return $class->gateway_timeout( $c ) if $error =~ /read timeout/;
        return $class->bad_gateway( $c );
    }

    unless ( $response->is_success ) {
        my $response_date = $response->date;
           $response_date = gmtime $response_date if defined $response_date;

        $resource->update(
            status_code   => $response->code,
            response_date => $response_date,
            content       => NOT_APPLICABLE,
        );

        return $class->do_show( $c, $resource->select->next );
    }

    if ( length $response->content >= 100 * 1024 ) { # 100 KB
        my $job = TheSchwartz::Simple::Job->new(
            funcname => 'MetaKGS::TheSchwartz::Worker::Scraper',
            uniqkey => $request->id,
            arg => {
                request_id    => $request->id,
                request_uri   => $uri->as_string,
                status_code   => $response->code,
                response_date => $response->date,
                raw_content   => encode_utf8( $response->decoded_content ),
            },
        );

        unless ( defined $c->the_schwartz->insert($job) ) {
            warnf 'Failed to insert a job: %s (id=%s)', $@, $request->id;
            return $class->internal_server_error( $c );
        }

        return $class->accepted( $c, $job->as_hashref );
    }

    my $response_date = $response->date;
       $response_date = gmtime $response_date if defined $response_date;

    $resource->update(
        status_code   => $response->code,
        response_date => $response_date,
        content       => $class->scrape( $response, $uri ),
    );

    $class->do_show( $c, $resource->select->next );
}

sub accepted {
    my ( $class, $c, $job ) = @_;
    my $is_grabbed = $job && $job->{grabbed_until} >= time;
    my $body = $class->template_class->accepted( $job || {} );
    my $response = $c->render_json( $body );

    $response->status( HTTP_ACCEPTED );
    $response->headers->retry_after( $job->{grabbed_until} ) if $is_grabbed;
    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    $response;
}

sub internal_server_error {
    my ( $class, $c, $message ) = @_;
    my $body = $class->template_class->internal_server_error( $message );
    my $response = $c->render_json( $body );

    $response->status( HTTP_INTERNAL_SERVER_ERROR );
    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    $response;
}

sub gateway_timeout {
    my ( $class, $c, $message ) = @_;
    my $body = $class->template_class->gateway_timeout( $message );
    my $response = $c->render_json( $body );

    $response->status( HTTP_GATEWAY_TIMEOUT );
    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    $response;
}

sub bad_gateway {
    my ( $class, $c, $message ) = @_;
    my $body = $class->template_class->bad_gateway( $message );
    my $response = $c->render_json( $body );

    $response->status( HTTP_BAD_GATEWAY );
    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    $response;
}

sub not_found {
    my ( $class, $c, $resource ) = @_;
    my $body = $class->template_class->not_found( $resource );
    my $response = $c->render_json( $body );

    $response->status( HTTP_NOT_FOUND );
    $response->header( 'Access-Control-Allow-Origin' => '*' );
    $response->header( 'Access-Control-Allow-Methods' => 'GET' );

    $response;
}

1;

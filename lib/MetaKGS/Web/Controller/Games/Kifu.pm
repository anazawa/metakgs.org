package MetaKGS::Web::Controller::Games::Kifu;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use Log::Minimal qw/warnf/;
use MetaKGS::FormValidator;
use MetaKGS::FormValidator::Constraints qw/game_slug/;
use Try::Tiny;

sub show {
    my ( $class, $c, $args ) = @_;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            year
            month
            day
            slug
        )],
        constraint_methods => {
            slug  => game_slug(),
            year  => sub { $_[1] =~ m/^[1-9]\d*$/ && $_[1] >= 2000 },
            month => sub { $_[1] =~ m/^(?:[1-9]|1[0-2])$/ },
            day   => sub { $_[1] =~ m/^(?:[1-9]|[12]\d|3[01])$/ },
        },
    });

    my $uri = URI->new( $c->upstream_files_uri );
       $uri->path( "/games/$query->{year}/$query->{month}/$query->{day}/$query->{slug}.sgf" );

    my $request = $c->user_agent->build_request( 'GET', $uri );
       
    my $response = try {
        $c->user_agent->get_response( $request );
    }
    catch {
        warnf '%s %s failed: %s', $request->method, $request->uri, $_;
    };

    return $c->res_502 unless $response;
    return $c->res_404 if $response->code == 404;

    unless ( $response->code == 200 ) {
        die "Don't know how to handle '", $response->code, "'";
    }
 
    $c->create_response(
        200,
        [
            'Content-Type'   => scalar $response->header('Content-Type'),
            'Content-Length' => scalar $response->header('Content-Length'),
            'ETag'           => scalar $response->header('ETag'),
            'Last-Modified'  => scalar $response->header('Last-Modified'),
            'Cache-Control'  => scalar $response->header('Cache-Control'),
        ],
        $response->content
    );
}

1;

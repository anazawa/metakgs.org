package MetaKGS::Upstream;
use strict;
use warnings;
use parent qw/Amon2/;
use HTTP::Status qw/HTTP_BAD_GATEWAY HTTP_GATEWAY_TIMEOUT status_message/;
use Log::Minimal qw/warnf/;
use LWP::UserAgent;
use Plack::Request;
use Plack::Response;
use Time::HiRes qw/time sleep/;
use Try::Tiny;

sub base_uri {
    $_[0]->{base_uri};
}

sub user_agent {
    my $self = shift;

    unless ( exists $self->{user_agent} ) {
        $self->{user_agent} = LWP::UserAgent->new(do {
            my $config = $self->config->{+__PACKAGE__} || {};
            %{ $config->{user_agent} || {} };
        });
    }

    $self->{user_agent};
}

sub delay {
    my $self = shift;

    unless ( exists $self->{delay} ) {
        my $config = $self->config->{+__PACKAGE__} || {};
        $self->{delay} = exists $config->{delay} ? $config->{delay} : 60;
    }

    $self->{delay};
}

sub last_visit {
    my $self = shift;
    $self->{last_visit} = shift if @_;
    $self->{last_visit} = 0 unless exists $self->{last_visit};
    $self->{last_visit};
}

sub to_app {
    my $self = shift;
    sub { $self->call(@_) };
}

sub call {
    my ( $self, $env ) = @_;
    my $request = Plack::Request->new( $env );
    my $delay = $self->last_visit + $self->delay - time;

    my $req = do {
        my $uri = URI->new( $self->base_uri );
           $uri->path( $request->path );
           $uri->query_form( $request->uri->query_form );

        my $headers = $request->headers->clone;
           $headers->header( 'X-Forwarded-For' => $request->address );
           $headers->remove_header( 'Host' );

        HTTP::Request->new(
            $request->method, $uri,
            $headers,
            $request->content
        );
    };

    sleep $delay if $delay > 0;

    my $res = $self->user_agent->simple_request( $req );

    $self->last_visit( time );

    my $error = do {
        my $client_warning = $res->header('Client-Warning') || q{};
        my $client_aborted = $res->header('Client-Aborted') || q{};

        if ( $client_warning eq 'Internal response' ) {
            $res->content || q{};
        }
        elsif ( $client_aborted eq 'die' ) {
            $res->header('X-Died') || q{};
        }
        else {
            undef;
        }
    };

    if ( defined $error ) {
        warnf '%s %s failed: %s', $req->method, $req->uri, $error;
        return $self->gateway_timeout if $error =~ /read timeout/;
        return $self->bad_gateway;
    }

    my $h = $res->headers->clone;

    $h->remove_header(
        # PSGI forbidden headers
        'Status',
        # Hop-by-hop headers (RFC2616 13.5.1)
        'Connection',
        'Keep-Alive',
        'Proxy-Authenticate',
        'Proxy-Authorization',
        'TE',
        'Trailer',
        'Transfer-Encoding',
        'Upgrade',
        ( map { split /\s*,\s*/ } $h->header('Connection') ),
        # LWP::UserAgent-specific headers
        ( grep { /^Client-/ } $h->header_field_names ), 
    );

    my @headers;
    $h->scan(sub {
        my ( $field, $value ) = @_;
        push @headers, $field, $value;
    });

    [
        $res->code,
        \@headers,
        [ $res->content ]
    ];
}

sub bad_gateway     { shift->_server_error( HTTP_BAD_GATEWAY,     @_ ) }
sub gateway_timeout { shift->_server_error( HTTP_GATEWAY_TIMEOUT, @_ ) }

sub _server_error {
    my $self = shift;
    my $code = shift;
    my $body = shift || status_message( $code );

    [
        $code,
        [
            'Content-Length' => length $body,
            'Content-Type'   => 'text/plain',
        ],
        [ $body ]
    ];
}

1;

__END__

=head1 SEE ALSO

L<Plack::App::Proxy>

=cut

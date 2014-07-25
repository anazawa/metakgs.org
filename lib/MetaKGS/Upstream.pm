package MetaKGS::Upstream;
use strict;
use warnings;
use parent qw/MetaKGS/;
use HTTP::Status qw/HTTP_BAD_GATEWAY HTTP_GATEWAY_TIMEOUT/;
use LWP::UserAgent;
use Plack::Request;
use Plack::Response;

BEGIN {
    my $last = 0;

    sub _sleep {
        my $interval = int shift;
        my $delay = $last + $interval - time;
        my $ret; $ret = sleep $delay if $delay >= 0;
        $last = time;
        $ret;
    }
}

sub to_app {
    my $class = shift;
    sub { $class->handle_request(@_) };
}

sub create_request {
    my ( $class, @args ) = @_;
    Plack::Request->new( @args );
}

sub handle_request {
    my ( $class, $env ) = @_;
    my $request = $class->create_request( $env );
    my $self = $class->new( request => $request );
    my $guard = $self->context_guard;
    $self->dispatch->finalize;
}

sub request {
    $_[0]->{request};
}

sub user_agent {
    my $self = shift;
    $self->{user_agent} ||= $self->_build_user_agent;
}

sub _build_user_agent {
    my $self = shift;
    my $config = $self->config->{'MetaKGS::Upstream'} || {};
    
    LWP::UserAgent->new(
        timeout => $config->{timeout},
    );
}

sub delay {
    my $self = shift;
    $self->{delay} ||= $self->_build_delay;
}

sub _build_delay {
    my $self = shift;
    my $config = $self->config->{'MetaKGS::Upstream'} || {};
    exists $config->{delay} ? $config->{delay} : 60;
}

sub create_response {
    my ( $self, @args ) = @_;
    Plack::Response->new( @args );
}

sub dispatch {
    my $self = shift;
    my $request = $self->request;

    _sleep $self->delay;

    my $req = do {
        my $uri = $request->uri;
           $uri->authority( 'www.gokgs.com' );

        my $headers = $request->headers->clone;
           $headers->header( 'X-Forwarded-For' => $request->address );
           $headers->remove_header( 'Host' );

        HTTP::Request->new(
            $request->method, $uri,
            $headers,
            $request->content
        );
    };

    my $res = $self->user_agent->simple_request( $req );

    my $is_internal = $res->header('Client-Warning') || q{};
       $is_internal = $is_internal eq 'Internal response';

    if ( $is_internal and $res->status_line =~ /read timeout/ ) {
        $self->create_response(
            HTTP_GATEWAY_TIMEOUT,
            [
                'Content-Length' => length $res->status_line,
                'Content-Type'   => 'text/plain',
            ],
            $res->status_line
        );
    }
    elsif ( $is_internal ) {
        $self->create_response(
            HTTP_BAD_GATEWAY,
            [
                'Content-Length' => length $res->status_line,
                'Content-Type'   => 'text/plain',
            ],
            $res->status_line
        );
    }
    else {
        my $headers = $res->headers->clone;

        for my $field (
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
            # Other hop-by-hop headers (code taken from Plack::App::Proxy)
            ( map { split /\s*,\s*/ } $headers->header('Connection') ),
            # LWP::UserAgent-specific headers (maybe)
            ( grep { /^Client-/ } $headers->header_field_names ), 
        ) {
            $headers->remove_header( $field );
        }

        $self->create_response(
            $res->code,
            $headers,
            $res->content
        );
    }
}

1;

__END__

=head1 SEE ALSO

L<Plack::App::Proxy>

=cut

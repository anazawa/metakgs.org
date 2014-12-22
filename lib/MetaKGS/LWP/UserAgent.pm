package MetaKGS::LWP::UserAgent;
use strict;
use warnings;
use parent qw/LWP::UserAgent/;
use Data::UUID;
use MetaKGS::Exception;
use MetaKGS::HTTP::Request;

sub build_request {
    my ( $self, @args ) = @_;
    my $request = MetaKGS::HTTP::Request->new( @args );

    # assign Request ID
    $request->id( Data::UUID->new->create_str );

    $request;
}

sub get_response {
    my ( $self, @args ) = @_;
    my $response = $self->get_response_safely( @args );
    my $client_warning = $response->header('Client-Warning') || q{};
    my $client_aborted = $response->header('Client-Aborted') || q{};

    if ( $client_warning eq 'Internal response' ) {
        MetaKGS::Exception::LWPUserAgent->throw(
            response => $response,
            error => $response->content || q{},
        );
    }
    elsif ( $client_aborted eq 'die' ) {
        MetaKGS::Exception::LWPUserAgent->throw(
            response => $response,
            error => (scalar $response->header('X-Died')) || q{},
        );
    }

    $response;
}

sub get_response_safely {
    my ( $self, @args ) = @_;
    $self->simple_request( @args );
}

1;

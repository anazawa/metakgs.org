package MetaKGS::Web::View::JSON;
use strict;
use warnings;
use JSON qw//;
use MetaKGS;
use Time::Piece qw/gmtime/;
use URI::Escape qw//;

sub uri_for {
    my ( $class, $path, $query ) = @_;
    my $encoding = MetaKGS->context->encoding;
    my $request = MetaKGS->context->request;

    $path =~ s{^/}{};

    my @query;
    for my $key ( keys %$query ) {
        my $value = $encoding->encode( $query->{$key} );
           $value = URI::Escape::uri_escape( $value );

        push @query, "$key=$value";
    }

    my $base_uri = $request->base->as_string;
       $base_uri =~ s{([^/])$}{$1/};

    $base_uri . $path . ( @query ? '?' . join '&', @query : q{} );
}

sub accepted {
    my ( $class, $job ) = @_;
    my $is_grabbed = %$job && $job->{grabbed_until} >= time;
    my $retry_after = $is_grabbed && gmtime $job->{grabbed_until};

    my %body = (
        message     => 'Accepted',
        retry_after => $is_grabbed ? $retry_after->datetime . 'Z' : undef,
        working     => $is_grabbed ? JSON::true : JSON::false,
        queued      => $is_grabbed ? JSON::false : JSON::true,
    );

    \%body;
}

sub not_found {
    my ( $class, $resource ) = @_;

    my %body = (
        message      => 'Not Found',
        request_url  => $resource->{request_uri}->as_string,
        requested_at => $resource->{request_date}->datetime . 'Z',
        responded_at => $resource->{response_date}->datetime . 'Z',
        content      => undef,
    );

    \%body;
}

sub internal_server_error {
    my ( $class, $message ) = @_;

    my %body = (
        message => $message || 'Internal Server Error',
    );

    \%body;
}

sub gateway_timeout {
    my ( $class, $message ) = @_;

    my %body = (
        message => $message || 'Gateway Timeout',
    );

    \%body;
}

sub bad_gateway {
    my ( $class, $message ) = @_;

    my %body = (
        message => $message || 'Bad Gateway',
    );

    \%body;
}

1;

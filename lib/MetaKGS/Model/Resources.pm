package MetaKGS::Model::Resources;
use strict;
use warnings;
use parent qw/MetaKGS::Model/;
use Data::FormValidator::Constraints::Dates qw/date_and_time/;
use MetaKGS::FormValidator;
use MetaKGS::Teng::Deflators qw/from_uri from_timepiece from_hash/;
use MetaKGS::Teng::Inflators qw/to_uri to_timepiece to_hash to_string/;
use Time::Piece qw/gmtime/;

sub insert {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my $values = MetaKGS::FormValidator->validate(\%args, {
        required => [qw(
            uri
            request_date
            status_code
        )],
        optional => [qw(
            response_date
            content
        )],
        field_filters => {
            uri           => \&from_uri,
            content       => \&from_hash,
            request_date  => \&from_timepiece,
            response_date => \&from_timepiece,
        },
        constraint_methods => {
            request_date  => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            response_date => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
        },
    });

    $self->do_insert( $values );
}

sub select {
    my $self = shift;

    my $cursor = $self->do_select(
        uri           => 'resources.uri',
        request_date  => 'resources.request_date',
        status_code   => 'resources.status_code',
        response_date => 'resources.response_date',
        content       => 'resources.content',
    );

    $cursor->add_inflator(
        uri           => \&to_uri,
        request_date  => \&to_timepiece,
        status_code   => \&to_string,
        response_date => \&to_timepiece,
        content       => \&to_hash,
    );

    $cursor;
}

sub uri_eq {
    my ( $self, $uri ) = @_;
    $self->where({ 'resources.uri' => from_uri($uri) });
}

sub request_date_eq {
    my ( $self, $date ) = @_;
    $self->where({ 'resources.request_date' => from_timepiece($date) });
}

sub order_by_request_date {
    my ( $self, $direction ) = @_;
    $self->order_by({ 'resources.request_date' => $direction || 'ASC' });
}

1;

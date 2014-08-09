package MetaKGS::Model::Resources;
use strict;
use warnings;
use parent qw/MetaKGS::Model/;
use Data::FormValidator::Constraints::Dates qw/date_and_time/;
use MetaKGS::FormValidator;
use MetaKGS::Teng::Constants qw/ASC/;
use MetaKGS::Teng::Deflators qw/from_uri from_timepiece from_hash/;
use MetaKGS::Teng::Inflators qw/to_uri to_timepiece to_hash to_string/;
use Time::Piece qw/gmtime/;

sub insert {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my $values = MetaKGS::FormValidator->validate(\%args, {
        required => [qw(
            request_id
            request_uri
            request_date
        )],
        optional => [qw(
            status_code
            response_date
            content
        )],
        field_filters => {
            request_uri   => \&from_uri,
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

    $self->clone->request_id_eq( $values->{request_id} );
}

sub update {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my $set = MetaKGS::FormValidator->validate(\%args, {
        required => [qw(
            status_code
        )],
        optional => [qw(
            response_date
            content
        )],
        field_filters => {
            content       => \&from_hash,
            response_date => \&from_timepiece,
        },
        constraint_methods => {
            response_date => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
        },
    });

    $self->do_update( $set );
}

sub select {
    my $self = shift;

    my $cursor = $self->do_select(
        request_id    => 'resources.request_id',
        request_uri   => 'resources.request_uri',
        request_date  => 'resources.request_date',
        status_code   => 'resources.status_code',
        response_date => 'resources.response_date',
        content       => 'resources.content',
    );

    $cursor->add_inflator(
        request_uri   => \&to_uri,
        request_date  => \&to_timepiece,
        status_code   => \&to_string,
        response_date => \&to_timepiece,
        content       => \&to_hash,
    );

    $cursor;
}

sub select_maximum_request_date {
    my $self = shift;

    my $row = do {
        my $cursor = $self->do_select(
            request_date => \'MAX(resources.request_date)',
        );

        $cursor->add_inflator(
            request_date => \&to_timepiece,
        );

        $cursor->next;
    };

    $row && $row->{request_date};
}

sub request_id_eq {
    my ( $self, $id ) = @_;
    $self->where({ 'resources.request_id' => $id });
}

sub request_uri_eq {
    my ( $self, $uri ) = @_;
    $self->where({ 'resources.request_uri' => from_uri($uri) });
}

sub status_code_ne {
    my ( $self, $code ) = @_;
    $self->where({ 'resources.status_code' => { '<>', $code } });
}

sub order_by_request_date {
    my ( $self, $direction ) = @_;
    $self->order_by({ 'resources.request_date' => $direction || ASC });
}

1;

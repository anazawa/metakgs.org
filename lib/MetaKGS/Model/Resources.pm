package MetaKGS::Model::Resources;
use strict;
use warnings;
use parent qw/MetaKGS::Model/;
use Data::FormValidator::Constraints::Dates qw/date_and_time/;
use MetaKGS::FormValidator;
use MetaKGS::Teng::Inflators qw/to_uri to_timepiece to_hash to_string/;
use MetaKGS::Teng::Deflators qw/from_uri from_timepiece from_hash/;
use Time::Piece qw/gmtime/;

sub insert {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my $values = MetaKGS::FormValidator->validate(\%args, {
        required => [qw(
            uri
            request_date
            insert_date
            update_date
        )],
        optional => [qw(
            status_code
            response_date
            last_modified
            etag
            content
        )],
        filters => {
            uri           => \&from_uri,
            content       => \&from_hash,
            insert_date   => \&from_timepiece,
            update_date   => \&from_timepiece,
            request_date  => \&from_timepiece,
            response_date => \&from_timepiece,
            last_modified => \&from_timepiece,
        },
        defaults => {
            insert_date => gmtime->strftime( '%Y-%m-%d %H:%M:%S' ),
            update_date => gmtime->strftime( '%Y-%m-%d %H:%M:%S' ),
        },
        constraint_methods => {
            insert_date   => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            update_date   => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            request_date  => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            response_date => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            last_modified => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
        },
    });

    $self->SUPER::insert( $values );
}

sub update {
    my $self = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;

    my $set = MetaKGS::FormValidator->validate(\%args, {
        required => [qw(
            update_date
        )],
        optional => [qw(
            request_date
            status_code
            response_date
            last_modified
            etag
            content
        )],
        filters => {
            update_date   => \&from_timepiece,
            request_date  => \&from_timepiece,
            response_date => \&from_timepiece,
            last_modified => \&from_timepiece,
            content       => \&from_hash,
        },
        defaults => {
            update_date => gmtime->strftime( '%Y-%m-%d %H:%M:%S' ),
        },
        constraint_methods => {
            update_date   => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            request_date  => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            response_date => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
            last_modified => date_and_time( 'YYYY-MM-DD hh:mm:ss' ),
        },
    });

    $self->SUPER::update( $set );
}

sub select {
    my $self = shift;

    my $cursor = $self->SUPER::select(
        uri           => 'resources.uri',
        request_date  => 'resources.request_date',
        status_code   => 'resources.status_code',
        response_date => 'resources.response_date',
        last_modified => 'resources.last_modified',
        etag          => 'resources.etag',
        content       => 'resources.content',
        insert_date   => 'resources.insert_date',
        update_date   => 'resources.update_date',
    );

    $cursor->add_inflator(
        uri           => \&to_uri,
        request_date  => \&to_timepiece,
        status_code   => \&to_string,
        response_date => \&to_timepiece,
        last_modified => \&to_timepiece,
        etag          => \&to_string,
        content       => \&to_hash,
        insert_date   => \&to_timepiece,
        update_date   => \&to_timepiece,
    );

    $cursor;
}

1;

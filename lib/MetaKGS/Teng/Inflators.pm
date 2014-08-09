package MetaKGS::Teng::Inflators;
use strict;
use warnings;
use Exporter qw/import/;
use JSON;
use MetaKGS::Teng::Constants qw/UNKNOWN NOT_APPLICABLE/;
use Time::Piece;

our @EXPORT_OK = qw(
    to_string
    to_uri
    to_timepiece
    to_hash
);

sub to_string {
    my $value = shift;

    return if $value eq UNKNOWN;
    return if $value eq NOT_APPLICABLE;

    $value;
}

sub to_uri {
    URI->new( $_[0] );
}

sub to_timepiece {
    my $value = shift;

    return if $value eq UNKNOWN;
    return if $value eq NOT_APPLICABLE;

    Time::Piece->strptime( $value, '%Y-%m-%d %H:%M:%S' );
}

sub to_hash {
    my $value = shift;

    return if $value eq UNKNOWN;
    return if $value eq NOT_APPLICABLE;

    JSON->new->decode( $value );
}

1;

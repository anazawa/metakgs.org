package MetaKGS::Teng::Inflators;
use strict;
use warnings;
use Exporter qw/import/;
use Time::Piece;
use JSON;

our @EXPORT_OK = qw(
    to_string
    to_uri
    to_timepiece
    to_hash
);

sub to_string {
    my $value = shift;

    return q{} if $value eq '{unknown}';
    return undef if $value eq '{n/a}';

    $value;
}

sub to_uri {
    URI->new( $_[0] );
}

sub to_timepiece {
    my $value = shift;

    if ( $value eq '{unknown}' ) {
        undef;
    }
    else {
        Time::Piece->strptime( $value, '%Y-%m-%d %H:%M:%S' );
    }
}

sub to_hash {
    my $value = shift;

    if ( $value eq '{n/a}' ) {
        undef;
    }
    else {
        JSON->new->decode( $value );
    }
}

1;

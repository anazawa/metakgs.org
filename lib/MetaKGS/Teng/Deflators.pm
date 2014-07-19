package MetaKGS::Teng::Deflators;
use strict;
use warnings;
use Exporter qw/import/;
use JSON;
use Scalar::Util qw/blessed/;

our @EXPORT_OK = qw(
    from_uri
    from_timepiece
    from_hash
);

sub from_uri {
    my $value = shift;

    if ( blessed $value and $value->isa('URI') ) {
        $value->as_string;
    }
    else {
        $value;
    }
}

sub from_timepiece {
    my $value = shift;

    if ( blessed $value and $value->isa('Time::Piece') ) {
        $value->strftime( '%Y-%m-%d %H:%M:%S' );
    }
    else {
        $value;
    }
}

sub from_hash {
    my $value = shift;

    if ( ref $value eq 'HASH' ) {
        JSON->new->encode( $value );
    }
    else {
        $value;
    }
}

1;

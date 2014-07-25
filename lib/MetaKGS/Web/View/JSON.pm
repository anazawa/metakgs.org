package MetaKGS::Web::View::JSON;
use strict;
use warnings;
use MetaKGS;
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

1;

package MetaKGS::FormValidator;
use strict;
use warnings;
use parent qw/Data::FormValidator/;

sub validate {
    my ( $class, @args ) = @_;
    my $result = $class->check( @args );

    return scalar $result->valid if $result->success;

    MetaKGS::Exception::FormValidator->throw(
        result => $result,
    );
}

1;

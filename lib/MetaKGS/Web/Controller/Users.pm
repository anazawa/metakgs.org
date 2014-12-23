package MetaKGS::Web::Controller::Users;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use Carp qw/croak/;
use MetaKGS::FormValidator;

sub do_show {
    croak 'call to abstract method ', __PACKAGE__, '::do_show';
}

sub show {
    my ( $class, $c, $args ) = @_;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            user
        )],
        constraint_methods => {
            user  => sub { $_[1] =~ m/^[a-z][a-z0-9]{0,9}$/ },
        },
    });

    $class->do_show( $c, $query );
}

1;

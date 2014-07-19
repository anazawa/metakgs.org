package MetaKGS::Web::Controller::Root;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;

sub index {
    my ( $class, $c, $args ) = @_;
    $c->render( 'index.tx' => {} );
}

1;

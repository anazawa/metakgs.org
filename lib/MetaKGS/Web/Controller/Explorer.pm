package MetaKGS::Web::Controller::Explorer;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;

sub show {
    my ( $class, $c, $args ) = @_;
    $c->render( 'explorer.tx' => {} );
}

1;

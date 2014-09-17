package MetaKGS::Web::Controller::Documentation;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;

sub show {
    my ( $class, $c, $args ) = @_;
    $c->render( 'documentation.tx' => {} );
}

1;

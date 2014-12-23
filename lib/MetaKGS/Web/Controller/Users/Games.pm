package MetaKGS::Web::Controller::Users::Games;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::Users/;

sub do_show {
    my ( $class, $c, $query ) = @_;

    $c->render('users/games.tx', {
       user => $query->{user},
    });
}

1;

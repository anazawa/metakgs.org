package MetaKGS::Web::Controller::Users::Rank;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller::Users/;

sub do_show {
    my ( $class, $c, $query ) = @_;

    $c->render('users/rank.tx', {
       user => $query->{user},
       graph_url => "http://www.gokgs.com/servlet/graph/$query->{user}-en_US.png",
    });
}

1;

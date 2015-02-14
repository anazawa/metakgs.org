package MetaKGS::Web::Controller::Users::Rank;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use MetaKGS::FormValidator;

sub show {
    my ( $class, $c, $args ) = @_;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            user
        )],
        constraint_methods => {
            user  => sub { $_[1] =~ m/^[a-z][a-z0-9]{0,9}$/i },
        },
    });

    $c->render('users/rank.tx', {
       user => $query->{user},
       graph_url => "http://www.gokgs.com/servlet/graph/$query->{user}-en_US.png",
    });
}

1;

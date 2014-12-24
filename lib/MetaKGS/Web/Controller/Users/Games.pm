package MetaKGS::Web::Controller::Users::Games;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use MetaKGS::FormValidator;
use Time::Piece qw/gmtime/;

sub show {
    my ( $class, $c, $args ) = @_;
    my $now = gmtime;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            user
        )],
        optional => [qw(
            year
            month
        )],
        defaults => {
            year  => $now->year,
            month => $now->mon,
        },
        constraint_methods => {
            user  => sub { $_[1] =~ m/^[a-z][a-z0-9]{0,9}$/ },
            year  => sub { $_[1] =~ m/^[2-9]\d\d\d$/ },
            month => sub { $_[1] =~ m/^(?:[1-9]|1[012])$/ },
        },
    });
 
    $c->render('users/games.tx', {
       user  => $query->{user},
       year  => $query->{year},
       month => $query->{month},
    });
}

1;

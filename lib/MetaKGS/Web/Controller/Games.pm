package MetaKGS::Web::Controller::Games;
use strict;
use warnings;
use parent qw/MetaKGS::Web::Controller/;
use MetaKGS::FormValidator;
use MetaKGS::FormValidator::Constraints qw/game_slug/;

sub show {
    my ( $class, $c, $args ) = @_;

    my $query = MetaKGS::FormValidator->validate($args, {
        required => [qw(
            year
            month
            day
            slug
        )],
        constraint_methods => {
            slug  => game_slug(),
            year  => sub { $_[1] =~ m/^[1-9]\d*$/ && $_[1] >= 2000 },
            month => sub { $_[1] =~ m/^(?:[1-9]|1[0-2])$/ },
            day   => sub { $_[1] =~ m/^(?:[1-9]|[12]\d|3[01])$/ },
        },
    });
 
    $c->render('games.tx', {
       sgf_url => $c->uri_for("/games/$query->{year}/$query->{month}/$query->{day}/$query->{slug}/kifu"),
    });
}

1;

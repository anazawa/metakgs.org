package MetaKGS::Web::View::JSON::GameArchives;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $args ) = @_;

    my %content = (
        games      => [],
        tgz_uri    => $args->{content}->{tgz_uri},
        zip_uri    => $args->{content}->{zip_uri},
        source_uri => $args->{uri}->as_string,
    );

    for my $game ( @{ $args->{content}->{games} || [] } ) {
        my $owner = $game->{owner} && $class->_user( $game->{owner} );
        my @white = map { $class->_user($_) } @{ $game->{white} || [] };
        my @black = map { $class->_user($_) } @{ $game->{black} || [] };

        push @{$content{games}}, {
            sgf_uri    => $game->{sgf_uri},
            owner      => $owner,
            white      => \@white,
            black      => \@black,
            board_size => $game->{board_size},
            handicap   => $game->{handicap},
            started_at => $game->{start_time} . 'Z',
            type       => $game->{type},
            result     => $game->{result},
        };
    }

    \%content;
}

sub _user {
    my ( $class, $args ) = @_;

    my %user = (
        name => $args->{name},
        rank => $args->{rank},
        games_uri => $class->uri_for( "api/games/$args->{name}" ),
    );

    \%user;
}

1;
